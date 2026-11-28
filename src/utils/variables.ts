import { Environment, HttpRequest, KeyValuePair, FormDataItem, AuthConfig } from '../types';
import { generateUuidV4 } from './id';

export interface VariableMatch {
  fullMatch: string;
  varName: string;
  startIndex: number;
  endIndex: number;
}

export interface VariableResolutionInfo {
  name: string;
  value: string;
  isResolved: boolean;
  source: 'environment' | 'global' | 'dynamic' | 'unresolved';
  sourceName: string;
  error?: string;
}

const DYNAMIC_VARIABLE_GENERATORS: Record<string, () => string> = {
  $guid: generateUuidV4,
  $uuid: generateUuidV4,
  $timestamp: () => Date.now().toString(),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => Math.floor(Math.random() * 1000 + 1).toString(),
};

function describeDynamicVariable(trimmed: string): string | null {
  switch (trimmed) {
    case '$guid':
    case '$uuid':
      return `Generates a random v4 UUID (e.g. ${generateUuidV4()})`;
    case '$timestamp':
      return `Current Unix timestamp (e.g. ${Date.now()})`;
    case '$isoTimestamp':
      return `Current ISO 8601 timestamp (e.g. ${new Date().toISOString()})`;
    case '$randomInt':
      return `Random integer 1-1000 (e.g. ${Math.floor(Math.random() * 1000 + 1)})`;
    default:
      return null;
  }
}

function resolveFromEnvironment(
  trimmed: string,
  env: Environment,
  source: 'environment' | 'global',
  sourceName: string,
  disabledError: string
): VariableResolutionInfo | null {
  const matched = env.variables?.find((v) => v.key.trim() === trimmed);
  if (!matched) return null;

  if (matched.enabled) {
    return {
      name: trimmed,
      value: matched.value,
      isResolved: true,
      source,
      sourceName,
    };
  }

  return {
    name: trimmed,
    value: matched.value,
    isResolved: false,
    source: 'unresolved',
    sourceName,
    error: disabledError,
  };
}

/**
 * Extracts all {{variable}} patterns from a given string with their start and end character positions.
 */
export function extractVariablesFromText(text: string): VariableMatch[] {
  if (!text || typeof text !== 'string') return [];
  const regex = /\{\{([^{}]+)\}\}/g;
  const matches: VariableMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      varName: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return matches;
}

/**
 * Finds the variable (if any) containing the given character index.
 */
export function findVariableAtCharIndex(text: string, charIndex: number): VariableMatch | null {
  const vars = extractVariablesFromText(text);
  return vars.find((v) => charIndex >= v.startIndex && charIndex < v.endIndex) || null;
}

/**
 * Finds the variable (if any) at a specific 0-indexed line and character offset in multiline text.
 */
export function findVariableInMultilineText(
  text: string,
  lineIndex: number,
  charInLine: number
): VariableMatch | null {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return null;

  let offset = 0;
  for (let i = 0; i < lineIndex; i++) {
    offset += lines[i].length + 1; // +1 for '\n'
  }
  const targetIndex = offset + charInLine;
  return findVariableAtCharIndex(text, targetIndex);
}

/**
 * Resolves detailed metadata for a variable name against active and global environments or dynamic generators.
 */
export function resolveVariableInfo(
  varName: string,
  activeEnv?: Environment,
  environments?: Environment[]
): VariableResolutionInfo {
  const trimmed = varName.trim();

  const dynamicDescription = describeDynamicVariable(trimmed);
  if (dynamicDescription !== null) {
    return {
      name: trimmed,
      value: dynamicDescription,
      isResolved: true,
      source: 'dynamic',
      sourceName: 'Dynamic Generator',
    };
  }

  if (activeEnv) {
    const activeResult = resolveFromEnvironment(
      trimmed,
      activeEnv,
      'environment',
      activeEnv.name,
      `Variable is disabled in '${activeEnv.name}' environment`
    );
    if (activeResult) return activeResult;
  }

  const globalEnv = environments?.find((e) => e.isGlobal);
  if (globalEnv) {
    const globalResult = resolveFromEnvironment(
      trimmed,
      globalEnv,
      'global',
      'Globals',
      'Variable is disabled in global environment'
    );
    if (globalResult) return globalResult;
  }

  // Unresolved variable
  const activeName = activeEnv ? `'${activeEnv.name}'` : 'active environment';
  return {
    name: trimmed,
    value: '',
    isResolved: false,
    source: 'unresolved',
    sourceName: activeEnv ? activeEnv.name : 'No Environment',
    error: activeEnv
      ? `Variable '${trimmed}' is not defined in ${activeName}`
      : `No active environment selected (variable '${trimmed}' cannot be resolved)`,
  };
}

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
    const generator = DYNAMIC_VARIABLE_GENERATORS[trimmed];
    if (generator) {
      return generator();
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
