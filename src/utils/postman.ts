import type {
  Collection,
  CollectionItem,
  HttpRequest,
  HttpMethod,
  KeyValuePair,
  BodyType,
  AuthConfig,
  FormDataItem,
} from '../types/index';
import { generateId, generateUuidV4 } from './id';

/**
 * Generates an RFC 4122 v4 compliant UUID
 */
export const generateUUID = generateUuidV4;

/**
 * Validates or converts an ID to a UUID v4
 */
function toValidUUID(id?: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (id && uuidRegex.test(id)) {
    return id.toLowerCase();
  }
  return generateUUID();
}

/**
 * Formats URL object conforming strictly to Postman Collection v2.1.0 schema
 */
export function formatPostmanUrl(
  rawUrl: string,
  params: KeyValuePair[]
): {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string; disabled?: boolean; description?: string }>;
} {
  const trimmed = (rawUrl || '').trim();
  const enabledParams = (params || []).filter((p) => p.enabled && p.key.trim() !== '');

  // Synchronize query parameters into raw URL if they are not already present
  let fullRaw = trimmed;
  if (enabledParams.length > 0 && !trimmed.includes('?')) {
    const qs = enabledParams.map((p) => `${p.key}=${p.value}`).join('&');
    fullRaw = `${trimmed}?${qs}`;
  }

  // Parse protocol, host, and path
  let protocol: string | undefined;
  let remaining = fullRaw;

  const protoMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (protoMatch) {
    protocol = protoMatch[1];
    remaining = remaining.substring(protoMatch[0].length);
  }

  const queryIdx = remaining.indexOf('?');
  const pathWithHost = queryIdx !== -1 ? remaining.substring(0, queryIdx) : remaining;

  let host: string[] | undefined;
  let path: string[] = [];

  const slashIdx = pathWithHost.indexOf('/');
  if (slashIdx !== -1) {
    const hostStr = pathWithHost.substring(0, slashIdx);
    const pathStr = pathWithHost.substring(slashIdx + 1);

    if (hostStr) {
      if (hostStr.startsWith('{{') && hostStr.endsWith('}}')) {
        host = [hostStr];
      } else {
        host = hostStr.split('.').filter(Boolean);
      }
    }
    path = pathStr.split('/').filter(Boolean);
  } else if (pathWithHost) {
    if (pathWithHost.startsWith('{{') && pathWithHost.endsWith('}}')) {
      host = [pathWithHost];
    } else {
      host = pathWithHost.split('.').filter(Boolean);
    }
  }

  const query =
    params && params.length > 0
      ? params
          .filter((p) => p.key.trim() !== '')
          .map((p) => ({
            key: p.key,
            value: p.value,
            disabled: !p.enabled,
            description: p.description || '',
          }))
      : undefined;

  return {
    raw: fullRaw,
    ...(protocol ? { protocol } : {}),
    ...(host && host.length > 0 ? { host } : {}),
    path,
    ...(query && query.length > 0 ? { query } : {}),
  };
}

/**
 * Formats authentication conforming to Postman Collection v2.1.0 schema
 */
export function formatPostmanAuth(auth?: AuthConfig): any {
  if (!auth || auth.type === 'none') {
    return undefined;
  }

  if (auth.type === 'bearer') {
    return {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: auth.bearerToken || '',
          type: 'string',
        },
      ],
    };
  }

  if (auth.type === 'basic') {
    return {
      type: 'basic',
      basic: [
        {
          key: 'username',
          value: auth.basicUsername || '',
          type: 'string',
        },
        {
          key: 'password',
          value: auth.basicPassword || '',
          type: 'string',
        },
      ],
    };
  }

  if (auth.type === 'apikey') {
    return {
      type: 'apikey',
      apikey: [
        {
          key: 'key',
          value: auth.apiKeyName || '',
          type: 'string',
        },
        {
          key: 'value',
          value: auth.apiKeyValue || '',
          type: 'string',
        },
        {
          key: 'in',
          value: auth.apiKeyLocation || 'header',
          type: 'string',
        },
      ],
    };
  }

  return undefined;
}

/**
 * Formats request body conforming to Postman Collection v2.1.0 schema
 */
export function formatPostmanBody(req: HttpRequest): any {
  if (req.bodyType === 'none') {
    return undefined;
  }

  if (req.bodyType === 'json') {
    return {
      mode: 'raw',
      raw: req.bodyContent || '',
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  if (req.bodyType === 'text') {
    return {
      mode: 'raw',
      raw: req.bodyContent || '',
      options: {
        raw: {
          language: 'text',
        },
      },
    };
  }

  if (req.bodyType === 'form-data') {
    return {
      mode: 'formdata',
      formdata: (req.formData || []).map((f) => ({
        key: f.key,
        value: f.type === 'text' ? f.value : undefined,
        src: f.type === 'file' ? f.filePath || f.fileName || '' : undefined,
        type: f.type === 'file' ? 'file' : 'text',
        disabled: !f.enabled,
      })),
    };
  }

  if (req.bodyType === 'urlencoded') {
    return {
      mode: 'urlencoded',
      urlencoded: (req.urlEncoded || []).map((u) => ({
        key: u.key,
        value: u.value,
        disabled: !u.enabled,
        description: u.description || '',
      })),
    };
  }

  if (req.bodyType === 'binary') {
    return {
      mode: 'file',
      file: {
        src: req.binaryFilePath || req.binaryFileName || '',
      },
    };
  }

  return undefined;
}

/**
 * Formats test and assertion scripts as Postman Collection events
 */
export function formatPostmanEvents(testScript?: string): any[] | undefined {
  if (!testScript || !testScript.trim()) {
    return undefined;
  }

  // Convert interceptor test syntax to native Postman pm.* syntax for seamless execution in Postman
  const converted = testScript
    .replace(/interceptor\.test\s*\(/g, 'pm.test(')
    .replace(/interceptor\.expect\s*\(/g, 'pm.expect(')
    .replace(/interceptor\.setEnvironmentVariable\s*\(/g, 'pm.environment.set(')
    .replace(/\bres\.status\b/g, 'pm.response.code')
    .replace(/\bres\.data\b/g, 'pm.response.json()')
    .replace(/\bres\.headers\b/g, 'pm.response.headers');

  return [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: converted.split('\n'),
      },
    },
  ];
}

/**
 * Extracts collection variables referenced via {{variableName}}
 */
export function extractCollectionVariables(
  collection: Collection,
  availableVariables?: Record<string, string>
): Array<{ key: string; value: string; type: string }> {
  const foundKeys = new Set<string>();
  const regex = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

  const scanText = (text?: string) => {
    if (!text) return;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const key = match[1];
      if (!key.startsWith('$')) {
        foundKeys.add(key);
      }
    }
  };

  const scanItem = (item: CollectionItem) => {
    if (item.children) {
      item.children.forEach(scanItem);
    }
    if (item.request) {
      const r = item.request;
      scanText(r.url);
      r.params.forEach((p) => {
        scanText(p.key);
        scanText(p.value);
      });
      r.headers.forEach((h) => {
        scanText(h.key);
        scanText(h.value);
      });
      scanText(r.bodyContent);
      if (r.formData) {
        r.formData.forEach((f) => {
          scanText(f.key);
          scanText(f.value);
        });
      }
      if (r.urlEncoded) {
        r.urlEncoded.forEach((u) => {
          scanText(u.key);
          scanText(u.value);
        });
      }
      if (r.auth) {
        scanText(r.auth.bearerToken);
        scanText(r.auth.basicUsername);
        scanText(r.auth.basicPassword);
        scanText(r.auth.apiKeyName);
        scanText(r.auth.apiKeyValue);
      }
    }
  };

  collection.items.forEach(scanItem);

  return Array.from(foundKeys).map((key) => ({
    key,
    value: availableVariables?.[key] || '',
    type: 'string',
  }));
}

/**
 * Exports an Interceptor Collection to Postman Collection v2.1.0 format
 * Fully validated and conforming to https://schema.getpostman.com/json/collection/v2.1.0/collection.json
 */
export function exportToPostman(
  collection: Collection,
  availableVariables?: Record<string, string>
): string {
  const mapItemToPostman = (item: CollectionItem): any => {
    if (item.type === 'folder') {
      return {
        name: item.name,
        item: (item.children || []).map(mapItemToPostman),
        description: '',
      };
    }

    const req = item.request;
    if (!req) {
      return {
        name: item.name,
        request: {
          method: 'GET',
          header: [],
          url: { raw: '' },
        },
        response: [],
      };
    }

    const headers = (req.headers || [])
      .filter((h) => h.key.trim() !== '')
      .map((h) => ({
        key: h.key,
        value: h.value,
        disabled: !h.enabled,
        description: h.description || '',
      }));

    const body = formatPostmanBody(req);
    const auth = formatPostmanAuth(req.auth);
    const event = formatPostmanEvents(req.testScript);
    const url = formatPostmanUrl(req.url, req.params);

    const postmanItem: any = {
      name: item.name || req.name,
      request: {
        method: req.method,
        header: headers,
        ...(body ? { body } : {}),
        url,
        ...(auth ? { auth } : {}),
      },
      response: [],
      ...(event ? { event } : {}),
    };

    return postmanItem;
  };

  const variables = extractCollectionVariables(collection, availableVariables);

  const postmanFormat: any = {
    info: {
      _postman_id: toValidUUID(collection.id),
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: collection.items.map(mapItemToPostman),
  };

  if (variables.length > 0) {
    postmanFormat.variable = variables;
  }

  return JSON.stringify(postmanFormat, null, 2);
}

/**
 * Imports a collection file (Postman Collection v2.0/v2.1 or Interceptor JSON)
 */
export function parseCollectionFile(rawContent: string): Collection {
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    throw new Error(`Invalid JSON file: ${err.message}`);
  }

  // Check if native Interceptor collection
  if (parsed.items && Array.isArray(parsed.items) && parsed.name) {
    return {
      id: parsed.id || `col-${Date.now()}`,
      name: parsed.name,
      description: parsed.description || '',
      items: parsed.items,
      createdAt: parsed.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }

  // Parse as Postman Collection (v2.0 or v2.1)
  const collectionName = parsed.info?.name || 'Imported Postman Collection';
  const description =
    typeof parsed.info?.description === 'string'
      ? parsed.info.description
      : parsed.info?.description?.content || '';

  const collectionId = parsed.info?._postman_id || `col-${Date.now()}`;

  const convertPostmanItem = (item: any): CollectionItem => {
    // If it has children items, treat as folder
    if (Array.isArray(item.item)) {
      return {
        id: item.id || generateId('folder'),
        name: item.name || 'Unnamed Folder',
        type: 'folder',
        children: item.item.map(convertPostmanItem),
      };
    }

    // It is a request
    const postmanReq = item.request || {};
    const method: HttpMethod = (postmanReq.method || 'GET').toUpperCase() as HttpMethod;

    // URL resolution
    let rawUrl = '';
    const params: KeyValuePair[] = [];

    if (typeof postmanReq.url === 'string') {
      rawUrl = postmanReq.url;
    } else if (postmanReq.url && typeof postmanReq.url === 'object') {
      rawUrl = postmanReq.url.raw || '';
      if (Array.isArray(postmanReq.url.query)) {
        postmanReq.url.query.forEach((q: any) => {
          params.push({
            id: generateId('param'),
            key: q.key || '',
            value: q.value || '',
            enabled: q.disabled !== true,
            description: q.description || '',
          });
        });
      }
    }

    // Headers
    const headers: KeyValuePair[] = [];
    if (Array.isArray(postmanReq.header)) {
      postmanReq.header.forEach((h: any) => {
        headers.push({
          id: generateId('header'),
          key: h.key || '',
          value: h.value || '',
          enabled: h.disabled !== true,
          description: h.description || '',
        });
      });
    }

    // Authentication parsing
    let auth: AuthConfig = { type: 'none' };
    if (postmanReq.auth) {
      const pAuth = postmanReq.auth;
      if (pAuth.type === 'bearer') {
        const tokenObj = Array.isArray(pAuth.bearer)
          ? pAuth.bearer.find((b: any) => b.key === 'token')
          : undefined;
        auth = {
          type: 'bearer',
          bearerToken: tokenObj ? tokenObj.value : '',
        };
      } else if (pAuth.type === 'basic') {
        const userObj = Array.isArray(pAuth.basic)
          ? pAuth.basic.find((b: any) => b.key === 'username')
          : undefined;
        const passObj = Array.isArray(pAuth.basic)
          ? pAuth.basic.find((b: any) => b.key === 'password')
          : undefined;
        auth = {
          type: 'basic',
          basicUsername: userObj ? userObj.value : '',
          basicPassword: passObj ? passObj.value : '',
        };
      } else if (pAuth.type === 'apikey') {
        const keyObj = Array.isArray(pAuth.apikey)
          ? pAuth.apikey.find((a: any) => a.key === 'key')
          : undefined;
        const valObj = Array.isArray(pAuth.apikey)
          ? pAuth.apikey.find((a: any) => a.key === 'value')
          : undefined;
        const inObj = Array.isArray(pAuth.apikey)
          ? pAuth.apikey.find((a: any) => a.key === 'in')
          : undefined;
        auth = {
          type: 'apikey',
          apiKeyName: keyObj ? keyObj.value : '',
          apiKeyValue: valObj ? valObj.value : '',
          apiKeyLocation: inObj && inObj.value === 'query' ? 'query' : 'header',
        };
      }
    }

    // Body parsing
    let bodyType: BodyType = 'none';
    let bodyContent = '';
    const formData: FormDataItem[] = [];
    const urlEncoded: KeyValuePair[] = [];
    let binaryFilePath = '';

    if (postmanReq.body) {
      const mode = postmanReq.body.mode;
      if (mode === 'raw') {
        const lang = postmanReq.body.options?.raw?.language;
        bodyType =
          lang === 'json' ||
          postmanReq.body.raw?.trim()?.startsWith('{') ||
          postmanReq.body.raw?.trim()?.startsWith('[')
            ? 'json'
            : 'text';
        bodyContent = postmanReq.body.raw || '';
      } else if (mode === 'formdata' && Array.isArray(postmanReq.body.formdata)) {
        bodyType = 'form-data';
        postmanReq.body.formdata.forEach((f: any) => {
          formData.push({
            id: generateId('fd'),
            key: f.key || '',
            value: f.type === 'text' ? f.value || '' : '',
            type: f.type === 'file' ? 'file' : 'text',
            filePath: f.type === 'file' ? f.src || '' : undefined,
            fileName: f.type === 'file' && f.src ? f.src.split(/[/\\]/).pop() : undefined,
            enabled: f.disabled !== true,
          });
        });
      } else if (mode === 'urlencoded' && Array.isArray(postmanReq.body.urlencoded)) {
        bodyType = 'urlencoded';
        postmanReq.body.urlencoded.forEach((u: any) => {
          urlEncoded.push({
            id: generateId('ue'),
            key: u.key || '',
            value: u.value || '',
            enabled: u.disabled !== true,
            description: u.description || '',
          });
        });
      } else if (mode === 'file' && postmanReq.body.file) {
        bodyType = 'binary';
        binaryFilePath = postmanReq.body.file.src || '';
      }
    }

    // Test scripts parsing
    let testScript = '';
    if (Array.isArray(item.event)) {
      const testEvent = item.event.find((e: any) => e.listen === 'test');
      if (testEvent && testEvent.script) {
        if (Array.isArray(testEvent.script.exec)) {
          testScript = testEvent.script.exec.join('\n');
        } else if (typeof testEvent.script.exec === 'string') {
          testScript = testEvent.script.exec;
        }
      }
    }

    const req: HttpRequest = {
      id: generateId('req'),
      name: item.name || 'Unnamed Request',
      method,
      url: rawUrl,
      params,
      headers,
      auth,
      bodyType,
      bodyContent,
      formData: formData.length > 0 ? formData : undefined,
      urlEncoded: urlEncoded.length > 0 ? urlEncoded : undefined,
      binaryFilePath: binaryFilePath || undefined,
      testScript: testScript || undefined,
      collectionId,
    };

    return {
      id: item.id || generateId('item'),
      name: item.name || 'Unnamed Request',
      type: 'request',
      request: req,
    };
  };

  const items = Array.isArray(parsed.item) ? parsed.item.map(convertPostmanItem) : [];

  return {
    id: collectionId,
    name: collectionName,
    description,
    items,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function exportToInterceptor(collection: Collection): string {
  return JSON.stringify(collection, null, 2);
}
