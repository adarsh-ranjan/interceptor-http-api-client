import { Collection, Environment, HttpRequest } from '../types';

export const STORAGE_KEYS = {
  ENVIRONMENTS: 'interceptor_environments',
  ACTIVE_ENV_ID: 'interceptor_active_env_id',
  COLLECTIONS: 'interceptor_collections',
  HISTORY: 'interceptor_history',
  SIDEBAR_WIDTH: 'interceptor_sidebar_width',
  WORKBENCH_LAYOUT: 'interceptor_workbench_layout',
  EDITOR_RATIO: 'interceptor_editor_ratio',
  MOCK_SERVERS: 'interceptor_mock_servers',
} as const;

export const DEFAULT_WS_URL = 'wss://echo.websocket.org';
export const DEFAULT_SIDEBAR_WIDTH = 260;
export const DEFAULT_EDITOR_RATIO = 0.5;
export const MAX_HISTORY_ITEMS = 50;

export const DEFAULT_REQUEST: HttpRequest = {
  id: 'req-initial',
  name: 'New Request',
  method: 'GET',
  url: '{{baseUrl}}/posts/1',
  params: [],
  headers: [
    {
      id: 'h-1',
      key: 'Accept',
      value: 'application/json',
      enabled: true,
      description: 'Accepted response content-type',
    },
  ],
  auth: { type: 'none' },
  bodyType: 'none',
  bodyContent: '',
  formData: [],
  urlEncoded: [],
  testScript: `// Automatic assertions run upon response\ninterceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("Response is JSON", () => {\n  interceptor.expect(res.isJson).toBe(true);\n});\n`,
};

export const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'env-dev',
    name: 'Development',
    variables: [
      {
        id: 'var-1',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-2',
        key: 'apiKey',
        value: 'dev_token_secret_9981',
        enabled: true,
      },
    ],
  },
  {
    id: 'env-prod',
    name: 'Production',
    variables: [
      {
        id: 'var-3',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-4',
        key: 'apiKey',
        value: 'prod_token_live_4412',
        enabled: true,
      },
    ],
  },
];

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
