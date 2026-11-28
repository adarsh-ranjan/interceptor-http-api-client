export interface DynamicMockSnippet {
  name: string;
  desc: string;
  code: string;
}

export const DYNAMIC_MOCK_SNIPPETS: DynamicMockSnippet[] = [
  {
    name: '📦 CRUD Store',
    desc: 'Stateful CRUD store persisting items across requests',
    code: `// Stateful in-memory store persists across requests during server runtime\nstore.items = store.items || [\n  { id: 1, name: "Sample Item 1", status: "active" },\n  { id: 2, name: "Sample Item 2", status: "pending" }\n];\n\nif (req.method === 'POST') {\n  const newItem = { id: store.items.length + 1, ...req.body, createdAt: utils.isoTimestamp() };\n  store.items.push(newItem);\n  return res.status(201).json({ success: true, item: newItem });\n}\n\nres.status(200).json({\n  total: store.items.length,\n  items: store.items\n});`,
  },
  {
    name: '🔍 Query Search',
    desc: 'Filters list based on ?search= query parameter',
    code: `const search = (req.query.search || '').toLowerCase();\nconst list = [\n  { id: 1, name: "Alpha", category: "dev" },\n  { id: 2, name: "Beta", category: "ops" },\n  { id: 3, name: "Gamma", category: "dev" }\n];\n\nconst filtered = search ? list.filter(i => i.name.toLowerCase().includes(search)) : list;\nres.status(200).json({ count: filtered.length, data: filtered });`,
  },
  {
    name: '🔑 Bearer Auth',
    desc: 'Validates Authorization header',
    code: `const authHeader = req.headers['authorization'] || '';\nif (!authHeader.startsWith('Bearer secret-token-123')) {\n  return res.status(401).json({\n    error: 'Unauthorized',\n    message: 'Missing or invalid Bearer token. Use Bearer secret-token-123'\n  });\n}\n\nres.status(200).json({ authenticated: true, user: { id: 'usr_1', role: 'admin' } });`,
  },
  {
    name: '⏱️ Latency Delay',
    desc: 'Asynchronously delays response via utils.sleep',
    code: `// Simulate network latency (1.5 seconds)\nawait utils.sleep(1500);\nres.status(200).json({\n  delayed: true,\n  latencyMs: 1500,\n  timestamp: utils.isoTimestamp()\n});`,
  },
  {
    name: '🎲 25% Chaos Error',
    desc: 'Randomly simulates a 500 error 25% of the time',
    code: `// Chaos Fault Injection: 25% failure rate\nif (Math.random() < 0.25) {\n  return res.status(500).json({\n    error: 'Internal Server Error',\n    message: 'Random chaos fault injection triggered'\n  });\n}\n\nres.status(200).json({ success: true, message: 'Chaos test passed' });`,
  },
  {
    name: '🪝 Webhook Receiver',
    desc: 'Accepts and stores incoming third-party webhooks',
    code: `// Record incoming third-party webhook\nstore.webhooks = store.webhooks || [];\nconst webhookRecord = {\n  id: utils.uuid(),\n  receivedAt: utils.isoTimestamp(),\n  headers: req.headers,\n  payload: req.body\n};\nstore.webhooks.push(webhookRecord);\n\nres.status(200).json({ received: true, eventId: webhookRecord.id });`,
  },
];
