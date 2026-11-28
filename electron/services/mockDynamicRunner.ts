import http from 'http';
import vm from 'vm';
import { MockRoute, MockServer } from '../types';

export interface DynamicExecutionInput {
  route: MockRoute;
  req: http.IncomingMessage;
  res: http.ServerResponse;
  pathname: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  store: Record<string, any>;
  config: MockServer;
}

export interface DynamicExecutionResult {
  statusCode: number;
  responseHeaders: Record<string, string>;
  finalBody: string;
}

export async function executeDynamicRouteScript({
  route,
  req,
  res,
  pathname,
  params,
  query,
  body,
  store,
  config,
}: DynamicExecutionInput): Promise<DynamicExecutionResult> {
  let statusCode = 200;
  const responseHeaders: Record<string, string> = {
    'content-type': 'application/json',
  };
  let responsePayload: any = null;
  let isFinished = false;

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
      uuid: () =>
        Math.random().toString(36).substring(2, 15) +
        '-' +
        Math.random().toString(36).substring(2, 9),
      timestamp: () => Date.now(),
      isoTimestamp: () => new Date().toISOString(),
      randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
      sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  };

  const context = vm.createContext(sandbox);

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

  return { statusCode, responseHeaders, finalBody };
}
