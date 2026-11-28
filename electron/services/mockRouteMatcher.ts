import { MockRoute } from '../types';

export function matchRoutePattern(
  pattern: string,
  actualPath: string
): { matched: boolean; params: Record<string, string> } {
  let cleanPattern = pattern.trim();
  if (!cleanPattern.startsWith('/')) cleanPattern = '/' + cleanPattern;
  if (cleanPattern.length > 1 && cleanPattern.endsWith('/')) {
    cleanPattern = cleanPattern.slice(0, -1);
  }

  if (cleanPattern === actualPath) {
    return { matched: true, params: {} };
  }

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

export function findMatchingRoute(
  routes: MockRoute[],
  method: string,
  pathname: string,
  prefix?: string
): { route: MockRoute; params: Record<string, string> } | null {
  let cleanPath =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (prefix && prefix.trim() && prefix !== '/') {
    const cleanPrefix = prefix.trim().startsWith('/') ? prefix.trim() : `/${prefix.trim()}`;
    if (cleanPath.startsWith(cleanPrefix)) {
      cleanPath = cleanPath.slice(cleanPrefix.length) || '/';
    }
  }

  for (const route of routes) {
    if (!route.enabled) continue;

    const routeMethod = (route.method || 'GET').toUpperCase();
    if (routeMethod !== 'ALL' && routeMethod !== method) {
      continue;
    }

    const paramMatch = matchRoutePattern(route.path, cleanPath);
    if (paramMatch.matched) {
      return { route, params: paramMatch.params };
    }
  }

  return null;
}

export function interpolateStaticBody(
  template: string,
  params: Record<string, string>,
  query: Record<string, string>,
  reqHeaders: Record<string, string>
): string {
  let responseBody = template || '';

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

  responseBody = responseBody.replaceAll('{{$guid}}', Math.random().toString(36).substring(2, 15));
  responseBody = responseBody.replaceAll('{{$uuid}}', Math.random().toString(36).substring(2, 15));
  responseBody = responseBody.replaceAll('{{$timestamp}}', String(Date.now()));
  responseBody = responseBody.replaceAll('{{$isoTimestamp}}', new Date().toISOString());
  responseBody = responseBody.replaceAll(
    '{{$randomInt}}',
    String(Math.floor(Math.random() * 1000) + 1)
  );

  return responseBody;
}
