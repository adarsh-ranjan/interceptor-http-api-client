import http from 'http';
import { MockServerManager } from '../electron/mockServerManager';
import { MockServer } from '../src/types/server';

function httpRequest(options: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const postData = options.body
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : '';

    const reqHeaders: Record<string, string> = {
      Connection: 'close',
      ...(options.headers || {}),
    };

    if (postData && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: options.port,
        path: options.path,
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            // keep raw
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            data,
            raw,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('\nRunning Interceptor Mock & Dynamic Server Test Suite...\n');

  const testLogs: any[] = [];
  const manager = new MockServerManager(() => ({
    isDestroyed: () => false,
    webContents: {
      send: (_channel: string, data: any) => {
        testLogs.push(data);
      },
    },
  } as any));

  const TEST_PORT = 19876;

  const testServerConfig: MockServer = {
    id: 'test-server-1',
    name: 'Unit Test Server',
    port: TEST_PORT,
    prefix: '',
    corsEnabled: true,
    defaultDelayMs: 0,
    status: 'stopped',
    createdAt: Date.now(),
    routes: [
      {
        id: 'r1',
        name: 'Health Check',
        method: 'GET',
        path: '/api/health',
        enabled: true,
        responseMode: 'static',
        delayMs: 0,
        staticResponse: {
          statusCode: 200,
          headers: [{ id: 'h1', key: 'X-Mock-Header', value: 'Interceptor', enabled: true }],
          body: JSON.stringify({ status: 'ok', uptime: 100 }),
        },
        dynamicScript: '',
        hitCount: 0,
      },
      {
        id: 'r2',
        name: 'Get User By ID',
        method: 'GET',
        path: '/api/users/:id',
        enabled: true,
        responseMode: 'dynamic',
        delayMs: 0,
        staticResponse: {
          statusCode: 200,
          headers: [],
          body: '',
        },
        dynamicScript: `
          const id = req.params.id;
          const filter = req.query.filter || 'all';
          res.status(200).json({ id, filter, received: true });
        `,
        hitCount: 0,
      },
      {
        id: 'r3',
        name: 'Stateful Items CRUD',
        method: 'ALL',
        path: '/api/items',
        enabled: true,
        responseMode: 'dynamic',
        delayMs: 0,
        staticResponse: {
          statusCode: 200,
          headers: [],
          body: '',
        },
        dynamicScript: `
          store.items = store.items || [];
          if (req.method === 'POST') {
            store.items.push(req.body);
            return res.status(201).json({ created: req.body });
          }
          res.status(200).json({ count: store.items.length, items: store.items });
        `,
        hitCount: 0,
      },
      {
        id: 'r5',
        name: 'Static Interpolation',
        method: 'GET',
        path: '/api/interpolate',
        enabled: true,
        responseMode: 'static',
        delayMs: 0,
        staticResponse: {
          statusCode: 200,
          headers: [{ id: 'h-int', key: 'Content-Type', value: 'application/json', enabled: true }],
          body: JSON.stringify({ time: '{{$timestamp}}', token: '{{headers.x-client-token}}' }),
        },
        dynamicScript: '',
        hitCount: 0,
      },
    ],
  };

  try {
    // 1. Start Server
    const startRes = await manager.startServer(testServerConfig);
    if (!startRes.success) {
      throw new Error(`Failed to start server: ${startRes.error}`);
    }
    console.log('✓ Scenario 1: Server started successfully on port ' + TEST_PORT);

    // 2. Static Route Response + Custom Headers
    const res1 = await httpRequest({ port: TEST_PORT, path: '/api/health' });
    if (res1.status !== 200 || res1.data.status !== 'ok' || res1.headers['x-mock-header'] !== 'Interceptor') {
      throw new Error(`Scenario 2 failed: unexpected static response ${JSON.stringify(res1)}`);
    }
    console.log('✓ Scenario 2: Static JSON route and custom headers match expected payload');

    // 3. Dynamic Route with URL Path Parameters & Query Strings
    const res2 = await httpRequest({ port: TEST_PORT, path: '/api/users/user_99?filter=active' });
    if (res2.status !== 200 || res2.data.id !== 'user_99' || res2.data.filter !== 'active') {
      throw new Error(`Scenario 3 failed: unexpected dynamic response ${JSON.stringify(res2)}`);
    }
    console.log('✓ Scenario 3: Dynamic JS handler extracted path parameter (:id) and query (?filter)');

    // 4. In-Memory Stateful Store (POST item then GET items)
    const postRes = await httpRequest({
      port: TEST_PORT,
      path: '/api/items',
      method: 'POST',
      body: { name: 'Keyboard', price: 99 },
    });
    if (postRes.status !== 201 || postRes.data.created.name !== 'Keyboard') {
      throw new Error(`Scenario 4 (POST) failed: ${JSON.stringify(postRes)}`);
    }

    const getRes = await httpRequest({ port: TEST_PORT, path: '/api/items', method: 'GET' });
    if (getRes.status !== 200 || getRes.data.count !== 1 || getRes.data.items[0].name !== 'Keyboard') {
      throw new Error(`Scenario 4 (GET) failed: ${JSON.stringify(getRes)}`);
    }
    console.log('✓ Scenario 4: Stateful in-memory store persists across POST and GET requests');

    // 5. CORS preflight OPTIONS request
    const corsRes = await httpRequest({ port: TEST_PORT, path: '/api/items', method: 'OPTIONS' });
    if (corsRes.status !== 204 || corsRes.headers['access-control-allow-origin'] !== '*') {
      throw new Error(`Scenario 5 failed: CORS OPTIONS preflight not handled ${JSON.stringify(corsRes)}`);
    }
    console.log('✓ Scenario 5: CORS preflight (OPTIONS) returns 204 No Content with Access-Control headers');

    // 6. 404 Not Found for unconfigured routes
    const notFoundRes = await httpRequest({ port: TEST_PORT, path: '/unmapped/path' });
    if (notFoundRes.status !== 404 || !notFoundRes.data.error) {
      throw new Error(`Scenario 6 failed: 404 not returned for unmapped path`);
    }
    console.log('✓ Scenario 6: Unmapped routes return 404 Not Found with helpful metadata');

    // 7. Phase 2: Static Response Variable Interpolation
    const interpRes = await httpRequest({
      port: TEST_PORT,
      path: '/api/interpolate',
      headers: { 'x-client-token': 'token-xyz-777' },
    });
    if (interpRes.status !== 200 || !interpRes.data.time || interpRes.data.token !== 'token-xyz-777') {
      throw new Error(`Scenario 7 failed: variable interpolation in static response failed ${JSON.stringify(interpRes)}`);
    }
    console.log('✓ Scenario 7: Static response interpolated dynamic variables ($timestamp, headers.*)');

    // 8. Phase 2: In-Memory Store Inspection, Modification, and Clearing
    const store = manager.getServerStore(testServerConfig.id);
    if (!store.items || store.items.length !== 1) {
      throw new Error(`Scenario 8 failed: expected store.items to have 1 item, got ${JSON.stringify(store)}`);
    }
    manager.setServerStore(testServerConfig.id, { seededKey: 'Custom Value', count: 42 });
    const updatedStore = manager.getServerStore(testServerConfig.id);
    if (updatedStore.seededKey !== 'Custom Value' || updatedStore.count !== 42) {
      throw new Error(`Scenario 8 failed: setServerStore did not update store`);
    }
    manager.clearServerStore(testServerConfig.id);
    const clearedStore = manager.getServerStore(testServerConfig.id);
    if (Object.keys(clearedStore).length !== 0) {
      throw new Error(`Scenario 8 failed: clearServerStore did not empty store`);
    }
    console.log('✓ Scenario 8: In-Memory store successfully inspected, updated, and cleared via store API');

    // 9. Phase 2: Proxy Fallback to Real Upstream
    const UPSTREAM_PORT = 19877;
    const upstreamServer = http.createServer((uReq, uRes) => {
      uRes.statusCode = 200;
      uRes.setHeader('Content-Type', 'application/json');
      uRes.end(JSON.stringify({ proxied: true, upstreamPath: uReq.url }));
    });
    await new Promise<void>((r) => upstreamServer.listen(UPSTREAM_PORT, '127.0.0.1', r));

    try {
      // Reconfigure server with proxy fallback enabled
      const proxyServerConfig: MockServer = {
        ...testServerConfig,
        proxyFallbackEnabled: true,
        proxyFallbackUrl: `http://127.0.0.1:${UPSTREAM_PORT}`,
      };
      await manager.startServer(proxyServerConfig);

      // Call an unmapped path which should now be proxied
      const proxiedRes = await httpRequest({ port: TEST_PORT, path: '/upstream/resource/123?page=2' });
      if (proxiedRes.status !== 200 || !proxiedRes.data.proxied || proxiedRes.data.upstreamPath !== '/upstream/resource/123?page=2') {
        throw new Error(`Scenario 9 failed: proxy fallback did not return upstream response ${JSON.stringify(proxiedRes)}`);
      }
      console.log('✓ Scenario 9: Proxy fallback seamlessly forwarded unmapped route to upstream server');
    } finally {
      await new Promise<void>((r) => upstreamServer.close(() => r()));
    }

    // 10. Stop Server Cleanly
    const stopRes = await manager.stopServer(testServerConfig.id);
    if (!stopRes.success) {
      throw new Error(`Scenario 10 failed: could not stop server ${stopRes.error}`);
    }
    console.log('✓ Scenario 10: Server stopped cleanly');

    console.log('\n✓ All 10 Mock & Dynamic Server test scenarios passed successfully!\n');
  } finally {
    await manager.stopAll();
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
