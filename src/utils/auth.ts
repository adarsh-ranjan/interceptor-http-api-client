import { AuthConfig, KeyValuePair, HttpRequest } from '../types';

export function getAuthSummary(auth?: AuthConfig): string {
  if (!auth || auth.type === 'none') return 'None';
  switch (auth.type) {
    case 'bearer':
      return 'Bearer';
    case 'basic':
      return 'Basic';
    case 'apikey':
      return 'API Key';
    default:
      return 'None';
  }
}

export function applyAuthToHeadersAndParams(
  auth: AuthConfig | undefined,
  existingHeaders: KeyValuePair[],
  existingParams: KeyValuePair[]
): { headers: KeyValuePair[]; params: KeyValuePair[] } {
  if (!auth || auth.type === 'none') {
    return { headers: existingHeaders, params: existingParams };
  }

  const headers = [...existingHeaders];
  const params = [...existingParams];

  if (auth.type === 'bearer' && auth.bearerToken?.trim()) {
    const authHeaderIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === 'authorization'
    );
    const authVal = `Bearer ${auth.bearerToken.trim()}`;

    if (authHeaderIndex >= 0) {
      headers[authHeaderIndex] = {
        ...headers[authHeaderIndex],
        value: authVal,
        enabled: true,
      };
    } else {
      headers.push({
        id: 'auth-header-bearer',
        key: 'Authorization',
        value: authVal,
        enabled: true,
        description: 'Bearer Token Authorization',
      });
    }
  } else if (auth.type === 'basic' && (auth.basicUsername || auth.basicPassword)) {
    const authHeaderIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === 'authorization'
    );
    const user = auth.basicUsername || '';
    const pass = auth.basicPassword || '';
    let encoded = '';
    try {
      encoded = btoa(`${user}:${pass}`);
    } catch {
      encoded = Buffer.from(`${user}:${pass}`).toString('base64');
    }
    const authVal = `Basic ${encoded}`;

    if (authHeaderIndex >= 0) {
      headers[authHeaderIndex] = {
        ...headers[authHeaderIndex],
        value: authVal,
        enabled: true,
      };
    } else {
      headers.push({
        id: 'auth-header-basic',
        key: 'Authorization',
        value: authVal,
        enabled: true,
        description: 'Basic Auth Authorization',
      });
    }
  } else if (auth.type === 'apikey' && auth.apiKeyName?.trim() && auth.apiKeyValue !== undefined) {
    const key = auth.apiKeyName.trim();
    const value = auth.apiKeyValue;

    if (auth.apiKeyLocation === 'query') {
      const paramIndex = params.findIndex((p) => p.key === key);
      if (paramIndex >= 0) {
        params[paramIndex] = { ...params[paramIndex], value, enabled: true };
      } else {
        params.push({
          id: 'auth-param-apikey',
          key,
          value,
          enabled: true,
          description: 'API Key query parameter',
        });
      }
    } else {
      // Header location
      const headerIndex = headers.findIndex((h) => h.key.toLowerCase() === key.toLowerCase());
      if (headerIndex >= 0) {
        headers[headerIndex] = { ...headers[headerIndex], value, enabled: true };
      } else {
        headers.push({
          id: 'auth-header-apikey',
          key,
          value,
          enabled: true,
          description: 'API Key header',
        });
      }
    }
  }

  return { headers, params };
}
