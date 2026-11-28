import http from 'http';
import { URL } from 'url';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './ipcChannels';
import { executeDynamicRouteScript } from './services/mockDynamicRunner';
import { findMatchingRoute, interpolateStaticBody } from './services/mockRouteMatcher';
import { MockRoute, MockServer, ServerLogEntry } from './types';

interface ActiveServer {
  server: http.Server;
  config: MockServer;
}

const isDev = process.env.NODE_ENV === 'development';

async function readIncomingBody(req: http.IncomingMessage): Promise<{ rawBody: string; parsedBody: any }> {
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
          req.destroy(new Error('Request body too large'));
          rejectBody(new Error('Request body exceeded 10MB limit'));
        }
      });
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf-8')));
      req.on('error', (err) => rejectBody(err));
    });

    if (rawBody.trim()) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }
  } catch (bodyErr) {
    console.error('[MockServer] Error reading body:', bodyErr);
  }

  return { rawBody, parsedBody };
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
    if (this.servers.has(config.id)) {
      await this.stopServer(config.id);
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      return { success: false, error: `Invalid port: ${config.port}` };
    }

    if (!this.serverStores.has(config.id)) {
      this.serverStores.set(config.id, {});
    }
    const store = this.serverStores.get(config.id)!;

    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        await this.handleIncomingRequest(config, store, req, res);
      });

      server.once('error', (err: any) => {
        const errorMsg =
          err.code === 'EADDRINUSE'
            ? `Port ${config.port} is already in use by another application.`
            : err.message || 'Failed to start server';

        this.sendToRenderer(IPC_CHANNELS.MOCK_SERVER_STATUS_CHANGE, {
          serverId: config.id,
          status: 'error',
          error: errorMsg,
        });

        resolve({ success: false, error: errorMsg });
      });

      server.listen(config.port, '0.0.0.0', () => {
        this.servers.set(config.id, { server, config });
        this.sendToRenderer(IPC_CHANNELS.MOCK_SERVER_STATUS_CHANGE, {
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
        this.sendToRenderer(IPC_CHANNELS.MOCK_SERVER_STATUS_CHANGE, {
          serverId,
          status: 'stopped',
        });
        resolve(err ? { success: false, error: err.message } : { success: true });
      });
    });
  }

  public async stopAll(): Promise<{ success: boolean }> {
    await Promise.all(Array.from(this.servers.keys()).map((id) => this.stopServer(id)));
    return { success: true };
  }

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

  private async handleIncomingRequest(
    config: MockServer,
    store: Record<string, any>,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    const startTime = Date.now();
    const reqUrl = req.url || '/';
    const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    const query: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    const { rawBody, parsedBody } = await readIncomingBody(req);

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

    const matchResult = findMatchingRoute(config.routes, method, pathname, config.prefix);

    if (!matchResult) {
      if (config.proxyFallbackEnabled && config.proxyFallbackUrl?.trim()) {
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

      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(notFoundPayload);

      this.logRequest({
        id: Math.random().toString(36).substring(2, 11),
        serverId: config.id,
        timestamp: startTime,
        method,
        url: reqUrl,
        path: pathname,
        statusCode: 404,
        durationMs: Date.now() - startTime,
        requestHeaders: req.headers as Record<string, string>,
        requestQuery: query,
        requestBody: parsedBody,
        responseBodyPreview: notFoundPayload,
        error: 'No route matched',
      });
      return;
    }

    const { route, params } = matchResult;
    route.hitCount = (route.hitCount || 0) + 1;
    route.lastHitAt = Date.now();

    const delayMs = (route.delayMs ?? 0) > 0 ? route.delayMs : (config.defaultDelayMs ?? 0);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      if (route.responseMode === 'dynamic') {
        const result = await executeDynamicRouteScript({
          route,
          req,
          res,
          pathname,
          params,
          query,
          body: parsedBody,
          store,
          config,
        });

        this.logRequest({
          id: Math.random().toString(36).substring(2, 11),
          serverId: config.id,
          timestamp: startTime,
          method: route.method,
          url: reqUrl,
          path: pathname,
          statusCode: result.statusCode,
          durationMs: Date.now() - startTime,
          matchedRouteId: route.id,
          matchedRouteName: route.name,
          requestHeaders: req.headers as Record<string, string>,
          requestQuery: query,
          requestBody: parsedBody,
          responseHeaders: result.responseHeaders,
          responseBodyPreview: result.finalBody.slice(0, 1000),
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
  }

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

      const fetchOptions: RequestInit = { method, headers: forwardHeaders };
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

    if (route.staticResponse.headers?.length) {
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

    const responseBody = interpolateStaticBody(
      route.staticResponse.body || '',
      params,
      query,
      reqHeaders
    );

    if (!hasContentType) {
      const trimmed = responseBody.trim();
      const contentType =
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
          ? 'application/json'
          : 'text/plain; charset=utf-8';
      res.setHeader('Content-Type', contentType);
      responseHeaders['content-type'] = contentType;
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

  private logRequest(log: ServerLogEntry) {
    this.sendToRenderer(IPC_CHANNELS.MOCK_SERVER_REQUEST_LOG, log);
  }
}
