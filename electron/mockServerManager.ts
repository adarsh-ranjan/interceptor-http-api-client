import http from 'http';
import { URL } from 'url';
import vm from 'vm';
import { BrowserWindow } from 'electron';
import { MockServer, MockRoute, ServerLogEntry, ServerStatus } from './types';

interface ActiveServer {
  server: http.Server;
  config: MockServer;
}

export class MockServerManager {
  private servers = new Map<string, ActiveServer>();
  private serverStores = new Map<string, Record<string, any>>();
  private getMainWindow: () => BrowserWindow | null;

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
  }

  private sendToRenderer(channel: string, ...args: any[]) {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }

  public async startServer(config: MockServer): Promise<{ success: boolean; error?: string }> {
    // If server already running, close existing first
    if (this.servers.has(config.id)) {
      await this.stopServer(config.id);
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      return { success: false, error: `Invalid port: ${config.port}` };
    }

    // Initialize or keep store for this server
    if (!this.serverStores.has(config.id)) {
      this.serverStores.set(config.id, {});
    }
    const store = this.serverStores.get(config.id)!;

    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        const startTime = Date.now();
        const reqUrl = req.url || '/';
        const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;
        const method = (req.method || 'GET').toUpperCase();

        // Convert searchParams to simple record
        const query: Record<string, string> = {};
        parsedUrl.searchParams.forEach((val, key) => {
          query[key] = val;
        });

        // 1. Read request body if present
        let rawBody = '';
        let parsedBody: any = null;

        try {
          rawBody = await new Promise<string>((resolveBody, rejectBody) => {
            const chunks: Buffer[] = [];
            let totalLength = 0;
            req.on('data', (chunk) => {
              chunks.push(chunk);
              totalLength += chunk.length;
              if (totalLength > 10 * 1024 * 1024) {
                // 10MB limit
                req.destroy(new Error('Request body too large'));
                rejectBody(new Error('Request body exceeded 10MB limit'));
              }
            });
            req.on('end', () => {
              resolveBody(Buffer.concat(chunks).toString('utf-8'));
            });
            req.on('error', (err) => rejectBody(err));
          });

          if (rawBody.trim()) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }
        } catch (bodyErr: any) {
          console.error('[MockServer] Error reading body:', bodyErr);
        }

        // 2. Handle CORS
        if (config.corsEnabled) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Allow-Credentials', 'true');

          if (method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            this.logRequest({
              id: Math.random().toString(36).substring(2, 11),
              serverId: config.id,
              timestamp: startTime,
              method: 'OPTIONS',
              url: reqUrl,
              path: pathname,
              statusCode: 204,
              durationMs: Date.now() - startTime,
              requestHeaders: req.headers as Record<string, string>,
              requestQuery: query,
              requestBody: parsedBody,
            });
            return;
          }
        }

        // 3. Match Route
        const matchResult = this.findMatchingRoute(config.routes, method, pathname, config.prefix);

        if (!matchResult) {
          // Phase 2: Check if Proxy Fallback is enabled
          if (config.proxyFallbackEnabled && config.proxyFallbackUrl && config.proxyFallbackUrl.trim()) {
            await this.proxyRequest({
              config,
              req,
              res,
              method,
              pathname,
              reqUrl,
              rawBody,
              parsedBody,
              query,
              startTime,
            });
            return;
          }

          // No route matched and no proxy: return 404
          const durationMs = Date.now() - startTime;
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          const notFoundPayload = JSON.stringify(
            {
              error: 'Not Found',
              message: `No matching route configured for ${method} ${pathname}`,
              server: config.name,
              availableRoutes: config.routes
                .filter((r) => r.enabled)
                .map((r) => `${r.method} ${r.path}`),
            },
            null,
            2
          );

          res.end(notFoundPayload);

          this.logRequest({
            id: Math.random().toString(36).substring(2, 11),
            serverId: config.id,
            timestamp: startTime,
            method,
            url: reqUrl,
            path: pathname,
            statusCode: 404,
            durationMs,
            requestHeaders: req.headers as Record<string, string>,
            requestQuery: query,
            requestBody: parsedBody,
            responseBodyPreview: notFoundPayload,
            error: 'No route matched',
          });
          return;
        }

        const { route, params } = matchResult;

        // Route hit counter
        route.hitCount = (route.hitCount || 0) + 1;
        route.lastHitAt = Date.now();

        // 4. Latency / Delay simulation
        const delayMs = (route.delayMs ?? 0) > 0 ? route.delayMs : (config.defaultDelayMs ?? 0);
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }

        // 5. Execute Handler (Static vs Dynamic)
        try {
          if (route.responseMode === 'dynamic') {
            await this.executeDynamicRoute({
              route,
              req,
              res,
              pathname,
              params,
              query,
              body: parsedBody,
              store,
              startTime,
              config,
              reqUrl,
            });
          } else {
            this.executeStaticRoute({
              route,
              res,
              pathname,
              params,
              query,
              body: parsedBody,
              startTime,
              config,
              reqUrl,
              reqHeaders: req.headers as Record<string, string>,
            });
          }
        } catch (err: any) {
          console.error('[MockServer] Handler error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify(
                {
                  error: 'Internal Server Error',
                  message: err.message || 'Error executing mock handler',
                  stack: isDev ? err.stack : undefined,
                },
                null,
                2
              )
            );
          }
        }
      });

      // Handle listen errors (like EADDRINUSE)
      server.once('error', (err: any) => {
        const errorMsg =
          err.code === 'EADDRINUSE'
            ? `Port ${config.port} is already in use by another application.`
            : err.message || 'Failed to start server';

        this.sendToRenderer('mock-server:status-change', {
          serverId: config.id,
          status: 'error',
          error: errorMsg,
        });

        resolve({ success: false, error: errorMsg });
      });

      server.listen(config.port, '0.0.0.0', () => {
        this.servers.set(config.id, { server, config });
        this.sendToRenderer('mock-server:status-change', {
          serverId: config.id,
          status: 'running',
        });
        resolve({ success: true });
      });
    });
  }

  public async stopServer(serverId: string): Promise<{ success: boolean; error?: string }> {
    const active = this.servers.get(serverId);
    if (!active) {
      return { success: true };
    }

    return new Promise((resolve) => {
      if (typeof (active.server as any).closeAllConnections === 'function') {
        (active.server as any).closeAllConnections();
      }
      active.server.close((err) => {
        this.servers.delete(serverId);
        this.sendToRenderer('mock-server:status-change', {
          serverId,
          status: 'stopped',
        });
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  public async stopAll(): Promise<{ success: boolean }> {
    const promises = Array.from(this.servers.keys()).map((id) => this.stopServer(id));
    await Promise.all(promises);
    return { success: true };
  }

  // Phase 2: In-Memory Store Management
  public getServerStore(serverId: string): Record<string, any> {
    return this.serverStores.get(serverId) || {};
  }

  public clearServerStore(serverId: string): boolean {
    this.serverStores.set(serverId, {});
    return true;
  }

  public setServerStore(serverId: string, data: Record<string, any>): boolean {
    this.serverStores.set(serverId, data || {});
    return true;
  }

  // Phase 2: Proxy Fallback to Real Upstream
  private async proxyRequest({
    config,
    req,
    res,
    method,
    pathname,
    reqUrl,
    rawBody,
    parsedBody,
    query,
    startTime,
  }: {
    config: MockServer;
    req: http.IncomingMessage;
    res: http.ServerResponse;
    method: string;
    pathname: string;
    reqUrl: string;
    rawBody: string;
    parsedBody: any;
    query: Record<string, string>;
    startTime: number;
  }) {
    const proxyBase = (config.proxyFallbackUrl || '').replace(/\/$/, '');
    const targetUrl = `${proxyBase}${reqUrl}`;
    const durationStart = Date.now();

    try {
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        const lower = k.toLowerCase();
        if (lower !== 'host' && lower !== 'connection' && lower !== 'content-length') {
          if (typeof v === 'string') forwardHeaders[k] = v;
          else if (Array.isArray(v)) forwardHeaders[k] = v.join(', ');
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: forwardHeaders,
      };

      if (rawBody && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = rawBody;
      }

      const upstreamRes = await fetch(targetUrl, fetchOptions);
      const upstreamBody = await upstreamRes.text();
      const durationMs = Date.now() - durationStart;

      res.statusCode = upstreamRes.status;
      const responseHeaders: Record<string, string> = {};

      upstreamRes.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (lower !== 'content-encoding' && lower !== 'transfer-encoding' && lower !== 'content-length') {
          res.setHeader(key, val);
          responseHeaders[lower] = val;
        }
      });

      res.end(upstreamBody);

      this.logRequest({
        id: Math.random().toString(36).substring(2, 11),
        serverId: config.id,
        timestamp: startTime,
        method,
        url: reqUrl,
        path: pathname,
        statusCode: upstreamRes.status,
        durationMs,
        requestHeaders: req.headers as Record<string, string>,
        requestQuery: query,
        requestBody: parsedBody,
        responseHeaders,
        responseBodyPreview: upstreamBody.slice(0, 1000),
        isProxied: true,
        proxyTargetUrl: targetUrl,
      });
    } catch (proxyErr: any) {
      const durationMs = Date.now() - durationStart;
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      const errPayload = JSON.stringify(
        {
          error: 'Bad Gateway',
          message: `Proxy fallback failed to connect to ${targetUrl}`,
          details: proxyErr.message,
        },
        null,
        2
      );
      res.end(errPayload);

      this.logRequest({
        id: Math.random().toString(36).substring(2, 11),
        serverId: config.id,
        timestamp: startTime,
        method,
        url: reqUrl,
        path: pathname,
        statusCode: 502,
        durationMs,
        requestHeaders: req.headers as Record<string, string>,
        requestQuery: query,
        requestBody: parsedBody,
        responseBodyPreview: errPayload,
        error: `Proxy failed: ${proxyErr.message}`,
        isProxied: true,
        proxyTargetUrl: targetUrl,
      });
    }
  }

  // --- Route Execution Helpers ---

  private executeStaticRoute({
    route,
    res,
    pathname,
    params,
    query,
    body,
    startTime,
    config,
    reqUrl,
    reqHeaders,
  }: {
    route: MockRoute;
    res: http.ServerResponse;
    pathname: string;
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    startTime: number;
    config: MockServer;
    reqUrl: string;
    reqHeaders: Record<string, string>;
  }) {
    const statusCode = route.staticResponse.statusCode || 200;
    res.statusCode = statusCode;

    let hasContentType = false;
    const responseHeaders: Record<string, string> = {};

    if (route.staticResponse.headers && route.staticResponse.headers.length > 0) {
      route.staticResponse.headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          res.setHeader(h.key, h.value);
          responseHeaders[h.key.toLowerCase()] = h.value;
          if (h.key.toLowerCase() === 'content-type') {
            hasContentType = true;
          }
        });
    }

    let responseBody = route.staticResponse.body || '';

    // Interpolate common request params like {{params.id}} or {{query.name}}
    for (const [pk, pv] of Object.entries(params)) {
      responseBody = responseBody.replaceAll(`{{params.${pk}}}`, pv);
      responseBody = responseBody.replaceAll(`{{req.params.${pk}}}`, pv);
    }
    for (const [qk, qv] of Object.entries(query)) {
      responseBody = responseBody.replaceAll(`{{query.${qk}}}`, qv);
      responseBody = responseBody.replaceAll(`{{req.query.${qk}}}`, qv);
    }
    for (const [hk, hv] of Object.entries(reqHeaders)) {
      responseBody = responseBody.replaceAll(`{{headers.${hk}}}`, String(hv));
      responseBody = responseBody.replaceAll(`{{req.headers.${hk}}}`, String(hv));
    }

    // Dynamic variable generators
    responseBody = responseBody.replaceAll('{{$guid}}', Math.random().toString(36).substring(2, 15));
    responseBody = responseBody.replaceAll('{{$uuid}}', Math.random().toString(36).substring(2, 15));
    responseBody = responseBody.replaceAll('{{$timestamp}}', String(Date.now()));
    responseBody = responseBody.replaceAll('{{$isoTimestamp}}', new Date().toISOString());
    responseBody = responseBody.replaceAll('{{$randomInt}}', String(Math.floor(Math.random() * 1000) + 1));

    if (!hasContentType) {
      const trimmed = responseBody.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        res.setHeader('Content-Type', 'application/json');
        responseHeaders['content-type'] = 'application/json';
      } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        responseHeaders['content-type'] = 'text/plain; charset=utf-8';
      }
    }

    res.end(responseBody);

    this.logRequest({
      id: Math.random().toString(36).substring(2, 11),
      serverId: config.id,
      timestamp: startTime,
      method: route.method,
      url: reqUrl,
      path: pathname,
      statusCode,
      durationMs: Date.now() - startTime,
      matchedRouteId: route.id,
      matchedRouteName: route.name,
      requestHeaders: reqHeaders,
      requestQuery: query,
      requestBody: body,
      responseHeaders,
      responseBodyPreview: responseBody.slice(0, 1000),
    });
  }

  private async executeDynamicRoute({
    route,
    req,
    res,
    pathname,
    params,
    query,
    body,
    store,
    startTime,
    config,
    reqUrl,
  }: {
    route: MockRoute;
    req: http.IncomingMessage;
    res: http.ServerResponse;
    pathname: string;
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    store: Record<string, any>;
    startTime: number;
    config: MockServer;
    reqUrl: string;
  }) {
    let statusCode = 200;
    const responseHeaders: Record<string, string> = {
      'content-type': 'application/json',
    };
    let responsePayload: any = null;
    let isFinished = false;

    // Build Express-like mock response object
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      setHeader: (name: string, val: string) => {
        responseHeaders[name.toLowerCase()] = String(val);
        return mockRes;
      },
      setHeaders: (headers: Record<string, string>) => {
        for (const [k, v] of Object.entries(headers)) {
          responseHeaders[k.toLowerCase()] = String(v);
        }
        return mockRes;
      },
      json: (data: any) => {
        responseHeaders['content-type'] = 'application/json';
        responsePayload = data;
        isFinished = true;
        return mockRes;
      },
      send: (data: any) => {
        responsePayload = data;
        isFinished = true;
        return mockRes;
      },
      end: (data?: any) => {
        if (data !== undefined) responsePayload = data;
        isFinished = true;
        return mockRes;
      },
    };

    const mockReq = {
      method: req.method,
      url: req.url,
      path: pathname,
      params,
      query,
      headers: req.headers,
      body,
    };

    const sandbox = {
      req: mockReq,
      res: mockRes,
      store,
      console: {
        log: (...args: any[]) => console.log(`[Mock:${config.name}]`, ...args),
        warn: (...args: any[]) => console.warn(`[Mock:${config.name}]`, ...args),
        error: (...args: any[]) => console.error(`[Mock:${config.name}]`, ...args),
      },
      JSON,
      Math,
      Date,
      Buffer,
      setTimeout,
      clearTimeout,
      utils: {
        uuid: () => Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 9),
        timestamp: () => Date.now(),
        isoTimestamp: () => new Date().toISOString(),
        randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
        sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      },
    };

    const context = vm.createContext(sandbox);

    // Support both direct code AND function wrapper
    let userScript = route.dynamicScript || '';
    if (userScript.includes('export default') || userScript.includes('module.exports')) {
      userScript = `
        const module = { exports: {} };
        const exports = module.exports;
        ${userScript.replace(/export\s+default\s+/, 'module.exports = ')}
        if (typeof module.exports === 'function') {
          return await module.exports(req, res, store);
        }
      `;
    }

    // Wrap in an async IIFE so users can safely use top-level 'return' and 'await'
    const wrappedScript = `(async () => {\n${userScript}\n})()`;
    const script = new vm.Script(wrappedScript);
    const result = script.runInContext(context, { timeout: 3000 });

    if (result instanceof Promise) {
      const asyncRes = await result;
      if (!isFinished && asyncRes !== undefined) {
        responsePayload = asyncRes;
        isFinished = true;
      }
    } else if (!isFinished && result !== undefined) {
      responsePayload = result;
      isFinished = true;
    }

    // Set HTTP status and headers
    res.statusCode = statusCode;
    for (const [k, v] of Object.entries(responseHeaders)) {
      res.setHeader(k, v);
    }

    let finalBody = '';
    if (typeof responsePayload === 'object' && responsePayload !== null) {
      finalBody = JSON.stringify(responsePayload, null, 2);
    } else if (responsePayload !== null && responsePayload !== undefined) {
      finalBody = String(responsePayload);
    }

    res.end(finalBody);

    this.logRequest({
      id: Math.random().toString(36).substring(2, 11),
      serverId: config.id,
      timestamp: startTime,
      method: route.method,
      url: reqUrl,
      path: pathname,
      statusCode,
      durationMs: Date.now() - startTime,
      matchedRouteId: route.id,
      matchedRouteName: route.name,
      requestHeaders: req.headers as Record<string, string>,
      requestQuery: query,
      requestBody: body,
      responseHeaders,
      responseBodyPreview: finalBody.slice(0, 1000),
    });
  }

  private findMatchingRoute(
    routes: MockRoute[],
    method: string,
    pathname: string,
    prefix?: string
  ): { route: MockRoute; params: Record<string, string> } | null {
    // Strip trailing slash except root
    let cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    // Check if prefix applies
    if (prefix && prefix.trim() && prefix !== '/') {
      const cleanPrefix = prefix.trim().startsWith('/') ? prefix.trim() : `/${prefix.trim()}`;
      if (cleanPath.startsWith(cleanPrefix)) {
        cleanPath = cleanPath.slice(cleanPrefix.length) || '/';
      }
    }

    for (const route of routes) {
      if (!route.enabled) continue;

      // Method match
      const routeMethod = (route.method || 'GET').toUpperCase();
      if (routeMethod !== 'ALL' && routeMethod !== method) {
        continue;
      }

      // Path match (supports :param and wildcards)
      const paramMatch = this.matchPattern(route.path, cleanPath);
      if (paramMatch.matched) {
        return { route, params: paramMatch.params };
      }
    }

    return null;
  }

  private matchPattern(pattern: string, actualPath: string): { matched: boolean; params: Record<string, string> } {
    let cleanPattern = pattern.trim();
    if (!cleanPattern.startsWith('/')) cleanPattern = '/' + cleanPattern;
    if (cleanPattern.length > 1 && cleanPattern.endsWith('/')) cleanPattern = cleanPattern.slice(0, -1);

    if (cleanPattern === actualPath) {
      return { matched: true, params: {} };
    }

    // Convert :param and * to RegExp
    const paramNames: string[] = [];
    const regexStr = cleanPattern
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\*/g, '(.*)');

    const regex = new RegExp(`^${regexStr}$`);
    const match = actualPath.match(regex);

    if (!match) {
      return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = decodeURIComponent(match[i + 1] || '');
    }

    return { matched: true, params };
  }

  private logRequest(log: ServerLogEntry) {
    this.sendToRenderer('mock-server:request-log', log);
  }
}

const isDev = process.env.NODE_ENV === 'development';
