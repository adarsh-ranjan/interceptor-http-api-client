import { useState } from 'react';
import { Collection } from '../types';

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-sample-1',
    name: 'JSONPlaceholder API',
    description: 'Sample REST API collection with tests & variables',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items: [
      {
        id: 'item-1',
        name: 'Get All Posts (with Tests)',
        type: 'request',
        request: {
          id: 'req-sample-1',
          name: 'Get All Posts (with Tests)',
          method: 'GET',
          url: '{{baseUrl}}/posts?_limit=10',
          params: [{ id: 'p1', key: '_limit', value: '10', enabled: true }],
          headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
          auth: { type: 'none' },
          bodyType: 'none',
          bodyContent: '',
          testScript: `interceptor.test("Status is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("Received 10 posts", () => {\n  interceptor.expect(res.data.length).toBe(10);\n});\n`,
        },
      },
      {
        id: 'item-2',
        name: 'Get Post by ID',
        type: 'request',
        request: {
          id: 'req-sample-2',
          name: 'Get Post by ID',
          method: 'GET',
          url: '{{baseUrl}}/posts/1',
          params: [],
          headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
          auth: { type: 'none' },
          bodyType: 'none',
          bodyContent: '',
          testScript: `interceptor.test("Status is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("ID is 1", () => {\n  interceptor.expect(res.data.id).toBe(1);\n});\n`,
        },
      },
      {
        id: 'folder-1',
        name: 'Authenticated Requests',
        type: 'folder',
        children: [
          {
            id: 'item-3',
            name: 'Create Post with Bearer Auth',
            type: 'request',
            request: {
              id: 'req-sample-3',
              name: 'Create Post with Bearer Auth',
              method: 'POST',
              url: '{{baseUrl}}/posts',
              params: [],
              headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
              auth: {
                type: 'bearer',
                bearerToken: '{{apiKey}}',
              },
              bodyType: 'json',
              bodyContent: JSON.stringify(
                {
                  title: 'Secure Upload',
                  body: 'Payload authenticated via Bearer token',
                  userId: 1,
                },
                null,
                2
              ),
              testScript: `interceptor.test("Post created", () => {\n  interceptor.expect(res.status).toBe(201);\n});\n`,
            },
          },
        ],
      },
    ],
  },
];

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_collections');
      return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
    } catch {
      return INITIAL_COLLECTIONS;
    }
  });

  const updateCollections = (newCols: Collection[]) => {
    setCollections(newCols);
    try {
      localStorage.setItem('interceptor_collections', JSON.stringify(newCols));
    } catch {
      // ignore
    }
  };

  return {
    collections,
    updateCollections,
  };
}
