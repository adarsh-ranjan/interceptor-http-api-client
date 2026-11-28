export type RouteResponseMode = 'static' | 'dynamic';

export interface RouteHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface MockRoute {
  id: string;
  name: string;
  method: string;
  path: string;
  enabled: boolean;
  responseMode: RouteResponseMode;
  delayMs: number;
  staticResponse: {
    statusCode: number;
    headers: RouteHeader[];
    body: string;
  };
  dynamicScript: string;
  hitCount: number;
  lastHitAt?: number;
}

export type ServerStatus = 'stopped' | 'running' | 'error';

export interface MockServer {
  id: string;
  name: string;
  port: number;
  prefix?: string;
  corsEnabled: boolean;
  defaultDelayMs: number;
  status: ServerStatus;
  errorMessage?: string;
  routes: MockRoute[];
  createdAt: number;
  proxyFallbackEnabled?: boolean;
  proxyFallbackUrl?: string;
}

export interface ServerLogEntry {
  id: string;
  serverId: string;
  timestamp: number;
  method: string;
  url: string;
  path: string;
  statusCode: number;
  durationMs: number;
  matchedRouteId?: string;
  matchedRouteName?: string;
  requestHeaders: Record<string, string>;
  requestQuery: Record<string, string>;
  requestBody: any;
  responseHeaders?: Record<string, string>;
  responseBodyPreview?: string;
  error?: string;
  isProxied?: boolean;
  proxyTargetUrl?: string;
}
