import { Collection, CollectionItem, HttpRequest, HttpMethod, KeyValuePair, BodyType } from '../types';

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
  const description = typeof parsed.info?.description === 'string'
    ? parsed.info.description
    : parsed.info?.description?.content || '';

  const collectionId = `col-${Date.now()}`;

  const convertPostmanItem = (item: any): CollectionItem => {
    // If it has children items, treat as folder
    if (Array.isArray(item.item)) {
      return {
        id: item.id || `folder-${Math.random().toString(36).substring(2, 9)}`,
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
            id: `param-${Math.random().toString(36).substring(2, 9)}`,
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
          id: `header-${Math.random().toString(36).substring(2, 9)}`,
          key: h.key || '',
          value: h.value || '',
          enabled: h.disabled !== true,
          description: h.description || '',
        });
      });
    }

    // Body
    let bodyType: BodyType = 'none';
    let bodyContent = '';

    if (postmanReq.body) {
      if (postmanReq.body.mode === 'raw') {
        const lang = postmanReq.body.options?.raw?.language;
        bodyType = lang === 'json' || postmanReq.body.raw?.trim()?.startsWith('{') ? 'json' : 'text';
        bodyContent = postmanReq.body.raw || '';
      } else if (postmanReq.body.mode === 'urlencoded' && Array.isArray(postmanReq.body.urlencoded)) {
        bodyType = 'text';
        bodyContent = postmanReq.body.urlencoded
          .filter((p: any) => !p.disabled)
          .map((p: any) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
      }
    }

    const req: HttpRequest = {
      id: `req-${Math.random().toString(36).substring(2, 9)}`,
      name: item.name || 'Unnamed Request',
      method,
      url: rawUrl,
      params,
      headers,
      bodyType,
      bodyContent,
      collectionId,
    };

    return {
      id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
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

export function exportToPostman(collection: Collection): string {
  const mapItemToPostman = (item: CollectionItem): any => {
    if (item.type === 'folder') {
      return {
        name: item.name,
        item: (item.children || []).map(mapItemToPostman),
      };
    }

    const req = item.request;
    if (!req) return { name: item.name };

    return {
      name: item.name || req.name,
      request: {
        method: req.method,
        header: req.headers.map((h) => ({
          key: h.key,
          value: h.value,
          disabled: !h.enabled,
          description: h.description,
        })),
        body: req.bodyType !== 'none'
          ? {
              mode: 'raw',
              raw: req.bodyContent,
              options: {
                raw: {
                  language: req.bodyType === 'json' ? 'json' : 'text',
                },
              },
            }
          : undefined,
        url: {
          raw: req.url,
          query: req.params.map((p) => ({
            key: p.key,
            value: p.value,
            disabled: !p.enabled,
            description: p.description,
          })),
        },
      },
    };
  };

  const postmanFormat = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: collection.items.map(mapItemToPostman),
  };

  return JSON.stringify(postmanFormat, null, 2);
}

export function exportToInterceptor(collection: Collection): string {
  return JSON.stringify(collection, null, 2);
}
