import { MockServer, MockRoute } from '../types/server';

export const DEFAULT_MOCK_ROUTES: MockRoute[] = [
  {
    id: 'route-users-list',
    name: 'Get All Users',
    method: 'GET',
    path: '/api/users',
    enabled: true,
    responseMode: 'dynamic',
    delayMs: 0,
    staticResponse: {
      statusCode: 200,
      headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
      body: JSON.stringify(
        [
          { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
          { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'developer' },
        ],
        null,
        2
      ),
    },
    dynamicScript: `// Dynamic route with stateful in-memory store
store.users = store.users || [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "developer" }
];

const limit = parseInt(req.query.limit) || 10;
const results = store.users.slice(0, limit);

res.status(200).json({
  total: store.users.length,
  count: results.length,
  data: results
});`,
    hitCount: 0,
  },
  {
    id: 'route-user-create',
    name: 'Create User',
    method: 'POST',
    path: '/api/users',
    enabled: true,
    responseMode: 'dynamic',
    delayMs: 50,
    staticResponse: {
      statusCode: 201,
      headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
      body: '{\n  "id": "new-user-123",\n  "status": "created"\n}',
    },
    dynamicScript: `// Validate and append to in-memory store
store.users = store.users || [];

const { name, email, role } = req.body || {};

if (!name || !email) {
  return res.status(400).json({
    error: "Validation Failed",
    message: "Both 'name' and 'email' are required in request body"
  });
}

const newUser = {
  id: utils.uuid(),
  name,
  email,
  role: role || 'user',
  createdAt: new Date().toISOString()
};

store.users.push(newUser);

res.status(201).json({
  message: "User created successfully",
  user: newUser
});`,
    hitCount: 0,
  },
  {
    id: 'route-user-get',
    name: 'Get User By ID',
    method: 'GET',
    path: '/api/users/:id',
    enabled: true,
    responseMode: 'dynamic',
    delayMs: 0,
    staticResponse: {
      statusCode: 200,
      headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
      body: '{\n  "id": "{{params.id}}",\n  "name": "User {{params.id}}"\n}',
    },
    dynamicScript: `store.users = store.users || [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "developer" }
];

const user = store.users.find(u => u.id === req.params.id);

if (!user) {
  return res.status(404).json({
    error: "Not Found",
    message: \`User with id '\${req.params.id}' was not found\`
  });
}

res.status(200).json(user);`,
    hitCount: 0,
  },
  {
    id: 'route-health',
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    enabled: true,
    responseMode: 'static',
    delayMs: 0,
    staticResponse: {
      statusCode: 200,
      headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
      body: '{\n  "status": "ok",\n  "uptime": "operational",\n  "timestamp": "2026-11-27T00:00:00Z"\n}',
    },
    dynamicScript: `res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });`,
    hitCount: 0,
  },
];

export const DEFAULT_MOCK_SERVERS: MockServer[] = [
  {
    id: 'server-local-mock-1',
    name: 'Quick Mock API',
    port: 3001,
    prefix: '',
    corsEnabled: true,
    defaultDelayMs: 0,
    proxyFallbackEnabled: false,
    proxyFallbackUrl: 'https://jsonplaceholder.typicode.com',
    status: 'stopped',
    routes: DEFAULT_MOCK_ROUTES,
    createdAt: Date.now(),
  },
];

const STORAGE_KEY = 'interceptor_mock_servers';

export function loadMockServers(): MockServer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MOCK_SERVERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all servers start with 'stopped' status upon initial load
      return parsed.map((s: MockServer) => ({
        ...s,
        status: 'stopped' as const,
        errorMessage: undefined,
      }));
    }
  } catch (e) {
    console.error('Failed to load mock servers from storage', e);
  }
  return DEFAULT_MOCK_SERVERS;
}

export function saveMockServers(servers: MockServer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch (e) {
    console.error('Failed to save mock servers to storage', e);
  }
}
