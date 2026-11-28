import { DEFAULT_REQUEST } from '../constants/defaults';
import { BodyType, HttpMethod, HttpRequest, KeyValuePair } from '../types';
import { ServerLogEntry } from '../types/server';
import { generateSnippet } from './codegen';
import { generateId } from './id';

/**
 * Converts a captured Mock Server log entry into an executable HttpRequest.
 */
export function serverLogToHttpRequest(log: ServerLogEntry, port: number): HttpRequest {
  const queryStr =
    Object.keys(log.requestQuery || {}).length > 0
      ? '?' + new URLSearchParams(log.requestQuery).toString()
      : '';
  const fullUrl = `http://localhost:${port}${log.path}${queryStr}`;

  const queryParams: KeyValuePair[] = Object.entries(log.requestQuery || {}).map(([key, value]) => ({
    id: `param-${Date.now()}-${generateId()}`,
    key,
    value: String(value),
    enabled: true,
  }));

  const headerParams: KeyValuePair[] = Object.entries(log.requestHeaders || {})
    .filter(([k]) => !k.startsWith(':') && k.toLowerCase() !== 'host' && k.toLowerCase() !== 'connection')
    .map(([key, value]) => ({
      id: `header-${Date.now()}-${generateId()}`,
      key,
      value: String(value),
      enabled: true,
    }));

  let bodyContent = '';
  let bodyType: BodyType = 'none';

  if (log.requestBody) {
    if (typeof log.requestBody === 'object') {
      bodyContent = JSON.stringify(log.requestBody, null, 2);
      bodyType = 'json';
    } else {
      bodyContent = String(log.requestBody);
      bodyType = 'text';
    }
  }

  return {
    ...DEFAULT_REQUEST,
    id: `req-${Date.now()}`,
    name: `${log.method} ${log.path}`,
    method: (log.method || 'GET') as HttpMethod,
    url: fullUrl,
    params: queryParams,
    headers: headerParams,
    bodyType,
    bodyContent,
    auth: { type: 'none' },
  };
}

/**
 * Generates a cURL command string from a captured Mock Server log entry.
 */
export function buildCurlFromServerLog(log: ServerLogEntry, port: number): string {
  const fullUrl = `http://localhost:${port}${log.path}${
    Object.keys(log.requestQuery || {}).length > 0
      ? '?' + new URLSearchParams(log.requestQuery).toString()
      : ''
  }`;
  let cmd = `curl -X ${log.method} "${fullUrl}"`;
  for (const [k, v] of Object.entries(log.requestHeaders || {})) {
    if (!k.startsWith(':') && k.toLowerCase() !== 'host' && k.toLowerCase() !== 'content-length') {
      cmd += ` \\\n  -H "${k}: ${v}"`;
    }
  }
  if (log.requestBody) {
    const bodyStr =
      typeof log.requestBody === 'object' ? JSON.stringify(log.requestBody) : String(log.requestBody);
    cmd += ` \\\n  -d '${bodyStr}'`;
  }
  return cmd;
}

export { generateSnippet };
