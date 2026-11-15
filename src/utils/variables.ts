import { Environment, HttpRequest, KeyValuePair, FormDataItem, AuthConfig } from '../types';

export function getVariableMap(
  activeEnv?: Environment,
  globalEnv?: Environment
): Record<string, string> {
  const map: Record<string, string> = {};

  if (globalEnv) {
    for (const v of globalEnv.variables) {
      if (v.enabled && v.key.trim()) {
        map[v.key.trim()] = v.value;
      }
    }
  }

  if (activeEnv) {
    for (const v of activeEnv.variables) {
      if (v.enabled && v.key.trim()) {
        map[v.key.trim()] = v.value;
      }
    }
  }

  return map;
}

export function interpolateString(
  text: string,
  variables: Record<string, string>
): string {
  if (!text || typeof text !== 'string') return text;

  return text.replace(/\{\{([^{}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();

    if (trimmed === '$guid' || trimmed === '$uuid') {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    if (trimmed === '$timestamp') {
      return Date.now().toString();
    }

    if (trimmed === '$isoTimestamp') {
      return new Date().toISOString();
    }

    if (trimmed === '$randomInt') {
      return Math.floor(Math.random() * 1000 + 1).toString();
    }

    if (variables[trimmed] !== undefined) {
      return variables[trimmed];
    }

    return match;
  });
}

export function interpolateRequest(
  req: HttpRequest,
  activeEnv?: Environment,
  globalEnv?: Environment
): HttpRequest {
  const vars = getVariableMap(activeEnv, globalEnv);

  const resolvedUrl = interpolateString(req.url, vars);

  const resolvedParams: KeyValuePair[] = req.params.map((p) => ({
    ...p,
    key: interpolateString(p.key, vars),
    value: interpolateString(p.value, vars),
  }));

  const resolvedHeaders: KeyValuePair[] = req.headers.map((h) => ({
    ...h,
    key: interpolateString(h.key, vars),
    value: interpolateString(h.value, vars),
  }));

  let resolvedAuth: AuthConfig | undefined = undefined;
  if (req.auth) {
    resolvedAuth = {
      ...req.auth,
      bearerToken: req.auth.bearerToken ? interpolateString(req.auth.bearerToken, vars) : undefined,
      basicUsername: req.auth.basicUsername ? interpolateString(req.auth.basicUsername, vars) : undefined,
      basicPassword: req.auth.basicPassword ? interpolateString(req.auth.basicPassword, vars) : undefined,
      apiKeyName: req.auth.apiKeyName ? interpolateString(req.auth.apiKeyName, vars) : undefined,
      apiKeyValue: req.auth.apiKeyValue ? interpolateString(req.auth.apiKeyValue, vars) : undefined,
    };
  }

  const resolvedFormData: FormDataItem[] | undefined = req.formData?.map((item) => ({
    ...item,
    key: interpolateString(item.key, vars),
    value: interpolateString(item.value, vars),
  }));

  const resolvedUrlEncoded: KeyValuePair[] | undefined = req.urlEncoded?.map((item) => ({
    ...item,
    key: interpolateString(item.key, vars),
    value: interpolateString(item.value, vars),
  }));

  const resolvedBody = req.bodyType === 'json' || req.bodyType === 'text'
    ? interpolateString(req.bodyContent, vars)
    : req.bodyContent;

  return {
    ...req,
    url: resolvedUrl,
    params: resolvedParams,
    headers: resolvedHeaders,
    auth: resolvedAuth,
    formData: resolvedFormData,
    urlEncoded: resolvedUrlEncoded,
    bodyContent: resolvedBody,
  };
}
