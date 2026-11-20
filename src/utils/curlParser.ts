import { HttpMethod, KeyValuePair, AuthConfig, BodyType, FormDataItem } from '../types/index';
import { extractParamsFromUrl } from './http';

export interface ParsedCurlResult {
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  auth: AuthConfig;
  bodyType: BodyType;
  bodyContent: string;
  urlEncoded: KeyValuePair[];
  formData: FormDataItem[];
}

/**
 * Checks if the given text looks like a cURL command.
 */
export function isCurlCommand(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  // Starts with curl, $ curl, or has curl followed by URL or flags
  return /^(\$\s*)?curl(\s+|$)/i.test(trimmed);
}

function safeBase64Decode(str: string): string {
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(str);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
  } catch {
    // ignore
  }
  return '';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Tokenizes a command line string respecting single quotes, double quotes,
 * and backslash escape sequences.
 */
function tokenizeArgs(cmd: string): string[] {
  let cleaned = cmd.trim();
  if (cleaned.startsWith('$')) {
    cleaned = cleaned.slice(1).trim();
  }
  // Strip backslash / caret line continuations
  cleaned = cleaned.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ');

  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses a cURL command string into structured request components.
 * Returns null if the string is not a valid cURL command.
 */
export function parseCurlCommand(cmd: string): ParsedCurlResult | null {
  if (!isCurlCommand(cmd)) return null;

  const tokens = tokenizeArgs(cmd);
  if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
    return null;
  }

  let method: HttpMethod | undefined = undefined;
  let url = '';
  const rawHeaders: string[] = [];
  const rawDataParts: string[] = [];
  const rawUrlEncodedParts: { key: string; value: string }[] = [];
  const rawFormDataItems: { key: string; value: string; isFile: boolean; filePath?: string; fileName?: string }[] = [];
  let auth: AuthConfig | undefined = undefined;
  const cookies: string[] = [];

  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i];

    // Method flags: -X, --request
    if (token === '-X' || token === '--request') {
      i++;
      if (i < tokens.length) {
        method = tokens[i].toUpperCase() as HttpMethod;
      }
    } else if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase() as HttpMethod;
    }
    // Head flag: -I, --head
    else if (token === '-I' || token === '--head') {
      method = 'HEAD';
    }
    // Get flag: -G, --get
    else if (token === '-G' || token === '--get') {
      method = 'GET';
    }
    // Headers: -H, --header
    else if (token === '-H' || token === '--header') {
      i++;
      if (i < tokens.length) {
        rawHeaders.push(tokens[i]);
      }
    } else if (token.startsWith('-H') && token.length > 2) {
      rawHeaders.push(token.slice(2));
    }
    // User / Basic Auth: -u, --user
    else if (token === '-u' || token === '--user') {
      i++;
      if (i < tokens.length) {
        const userArg = tokens[i];
        const colonIdx = userArg.indexOf(':');
        if (colonIdx !== -1) {
          auth = {
            type: 'basic',
            basicUsername: userArg.slice(0, colonIdx),
            basicPassword: userArg.slice(colonIdx + 1),
          };
        } else {
          auth = {
            type: 'basic',
            basicUsername: userArg,
            basicPassword: '',
          };
        }
      }
    } else if (token.startsWith('-u') && token.length > 2) {
      const userArg = token.slice(2);
      const colonIdx = userArg.indexOf(':');
      if (colonIdx !== -1) {
        auth = {
          type: 'basic',
          basicUsername: userArg.slice(0, colonIdx),
          basicPassword: userArg.slice(colonIdx + 1),
        };
      } else {
        auth = {
          type: 'basic',
          basicUsername: userArg,
          basicPassword: '',
        };
      }
    }
    // OAuth2 Bearer flag: --oauth2-bearer
    else if (token === '--oauth2-bearer') {
      i++;
      if (i < tokens.length) {
        auth = {
          type: 'bearer',
          bearerToken: tokens[i],
        };
      }
    }
    // Cookie flag: -b, --cookie
    else if (token === '-b' || token === '--cookie') {
      i++;
      if (i < tokens.length) {
        cookies.push(tokens[i]);
      }
    }
    // User-Agent: -A, --user-agent
    else if (token === '-A' || token === '--user-agent') {
      i++;
      if (i < tokens.length) {
        rawHeaders.push(`User-Agent: ${tokens[i]}`);
      }
    }
    // Referer: -e, --referer
    else if (token === '-e' || token === '--referer') {
      i++;
      if (i < tokens.length) {
        rawHeaders.push(`Referer: ${tokens[i]}`);
      }
    }
    // Form data: -F, --form, --form-string
    else if (token === '-F' || token === '--form' || token === '--form-string') {
      i++;
      if (i < tokens.length) {
        const formArg = tokens[i];
        const eqIdx = formArg.indexOf('=');
        if (eqIdx !== -1) {
          const key = formArg.slice(0, eqIdx).trim();
          const val = formArg.slice(eqIdx + 1);
          if (val.startsWith('@')) {
            const cleanVal = val.slice(1).replace(/^["']|["']$/g, '');
            const semiIdx = cleanVal.indexOf(';');
            const filePath = semiIdx !== -1 ? cleanVal.slice(0, semiIdx) : cleanVal;
            const fileName = filePath.split(/[/\\]/).pop() || 'file';
            rawFormDataItems.push({
              key,
              value: '',
              isFile: true,
              filePath,
              fileName,
            });
          } else {
            rawFormDataItems.push({
              key,
              value: val,
              isFile: false,
            });
          }
        }
      }
    }
    // Data: -d, --data, --data-raw, --data-binary, --data-ascii
    else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      i++;
      if (i < tokens.length) {
        rawDataParts.push(tokens[i]);
      }
    } else if (token.startsWith('-d') && token.length > 2) {
      rawDataParts.push(token.slice(2));
    }
    // Data urlencode: --data-urlencode
    else if (token === '--data-urlencode') {
      i++;
      if (i < tokens.length) {
        const urlEnc = tokens[i];
        const eqIdx = urlEnc.indexOf('=');
        if (eqIdx !== -1) {
          rawUrlEncodedParts.push({
            key: urlEnc.slice(0, eqIdx).trim(),
            value: urlEnc.slice(eqIdx + 1),
          });
        } else {
          rawDataParts.push(urlEnc);
        }
      }
    }
    // Explicit URL flag: --url
    else if (token === '--url') {
      i++;
      if (i < tokens.length) url = tokens[i];
    }
    // Boolean flags to ignore
    else if (
      token === '-k' ||
      token === '--insecure' ||
      token === '-L' ||
      token === '--location' ||
      token === '-s' ||
      token === '--silent' ||
      token === '-S' ||
      token === '--show-error' ||
      token === '-v' ||
      token === '--verbose' ||
      token === '-i' ||
      token === '--include' ||
      token === '-f' ||
      token === '--fail' ||
      token === '--compressed' ||
      token === '-g' ||
      token === '--globoff' ||
      token === '--raw' ||
      token === '-N' ||
      token === '--no-buffer'
    ) {
      // Ignored boolean flags
    }
    // Flags that take an argument to ignore
    else if (
      token === '-o' ||
      token === '--output' ||
      token === '-O' ||
      token === '--remote-name' ||
      token === '-m' ||
      token === '--max-time' ||
      token === '--connect-timeout' ||
      token === '--cacert' ||
      token === '--cert' ||
      token === '--key' ||
      token === '-x' ||
      token === '--proxy' ||
      token === '--retry'
    ) {
      i++; // Skip argument
    }
    // Positional URL (argument not starting with -)
    else if (!token.startsWith('-')) {
      if (!url) {
        url = token;
      }
    }

    i++;
  }

  // Handle Cookie header
  if (cookies.length > 0) {
    rawHeaders.push(`Cookie: ${cookies.join('; ')}`);
  }

  // Parse headers into key-value pairs
  const headerPairs: KeyValuePair[] = [];
  let contentType = '';

  for (const h of rawHeaders) {
    const colonIdx = h.indexOf(':');
    if (colonIdx !== -1) {
      const key = h.slice(0, colonIdx).trim();
      const value = h.slice(colonIdx + 1).trim();

      // Check Authorization header if auth is not set via flags
      if (key.toLowerCase() === 'authorization' && !auth) {
        if (/^Bearer\s+/i.test(value)) {
          auth = {
            type: 'bearer',
            bearerToken: value.replace(/^Bearer\s+/i, '').trim(),
          };
        } else if (/^Basic\s+/i.test(value)) {
          const b64 = value.replace(/^Basic\s+/i, '').trim();
          const decoded = safeBase64Decode(b64);
          const cIdx = decoded.indexOf(':');
          if (cIdx !== -1) {
            auth = {
              type: 'basic',
              basicUsername: decoded.slice(0, cIdx),
              basicPassword: decoded.slice(cIdx + 1),
            };
          }
        }
      }

      if (key.toLowerCase() === 'content-type') {
        contentType = value.toLowerCase();
      }

      headerPairs.push({
        id: generateId(),
        key,
        value,
        enabled: true,
      });
    }
  }

  // Infer method if not explicitly set
  if (!method) {
    if (rawDataParts.length > 0 || rawUrlEncodedParts.length > 0 || rawFormDataItems.length > 0) {
      method = 'POST';
    } else {
      method = 'GET';
    }
  }

  // Clean URL
  url = url.trim().replace(/^["']|["']$/g, '');
  if (url && !/^https?:\/\//i.test(url) && !/^\{\{.*\}\}/.test(url)) {
    if (/^localhost[:\/]/i.test(url) || /^127\.0\.0\.1[:\/]/.test(url)) {
      url = `http://${url}`;
    }
  }

  // Extract query parameters from URL
  const params = extractParamsFromUrl(url);

  // Determine body
  let bodyType: BodyType = 'none';
  let bodyContent = '';
  let urlEncoded: KeyValuePair[] = [];
  let formData: FormDataItem[] = [];

  if (rawFormDataItems.length > 0) {
    bodyType = 'form-data';
    formData = rawFormDataItems.map((item) => ({
      id: generateId(),
      key: item.key,
      value: item.value,
      type: item.isFile ? ('file' as const) : ('text' as const),
      filePath: item.filePath,
      fileName: item.fileName,
      enabled: true,
    }));
  } else if (rawUrlEncodedParts.length > 0) {
    bodyType = 'urlencoded';
    urlEncoded = rawUrlEncodedParts.map((item) => ({
      id: generateId(),
      key: item.key,
      value: item.value,
      enabled: true,
    }));
    bodyContent = urlEncoded
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    if (!contentType.includes('application/x-www-form-urlencoded')) {
      headerPairs.push({
        id: generateId(),
        key: 'Content-Type',
        value: 'application/x-www-form-urlencoded',
        enabled: true,
      });
    }
  } else if (rawDataParts.length > 0) {
    const rawJoined = rawDataParts.join('&');
    bodyContent = rawJoined;

    const trimmed = rawJoined.trim();
    if (
      contentType.includes('application/json') ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      bodyType = 'json';
      try {
        const parsed = JSON.parse(trimmed);
        bodyContent = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep as-is if JSON.parse fails
      }
      // Ensure Content-Type header if missing
      if (!contentType.includes('application/json')) {
        headerPairs.push({
          id: generateId(),
          key: 'Content-Type',
          value: 'application/json',
          enabled: true,
        });
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      /^[a-zA-Z0-9_%+-]+=[^&]*(&[a-zA-Z0-9_%+-]+=[^&]*)*$/.test(trimmed)
    ) {
      bodyType = 'urlencoded';
      const pairs = trimmed.split('&');
      urlEncoded = pairs.map((pair) => {
        const eqIdx = pair.indexOf('=');
        const k = eqIdx !== -1 ? decodeURIComponent(pair.slice(0, eqIdx)) : pair;
        const v = eqIdx !== -1 ? decodeURIComponent(pair.slice(eqIdx + 1)) : '';
        return {
          id: generateId(),
          key: k,
          value: v,
          enabled: true,
        };
      });
      if (!contentType.includes('application/x-www-form-urlencoded')) {
        headerPairs.push({
          id: generateId(),
          key: 'Content-Type',
          value: 'application/x-www-form-urlencoded',
          enabled: true,
        });
      }
    } else {
      bodyType = 'text';
    }
  }

  return {
    method,
    url,
    params,
    headers: headerPairs,
    auth: auth || { type: 'none' },
    bodyType,
    bodyContent,
    urlEncoded,
    formData,
  };
}
