import React from 'react';
import { MockRoute, RouteResponseMode } from '../../types/server';
import { HttpMethod } from '../../types';
import { HttpMethodDropdown } from '../HttpMethodDropdown';
import { MockServerStaticResponse } from './MockServerStaticResponse';
import { DynamicScriptEditor } from '../DynamicScriptEditor';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Sparkles, FileText, Code2, Info } from 'lucide-react';

interface MockServerRouteEditorProps {
  currentRoute: MockRoute;
  onUpdateRoute: (updates: Partial<MockRoute>) => void;
}

const DYNAMIC_SNIPPETS = [
  {
    name: 'Echo Request',
    desc: 'Returns params, query, headers, and payload back to the client',
    code: `res.status(200).json({
  message: "Echo response from Interceptor Mock Engine",
  received: {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body
  },
  timestamp: utils.isoTimestamp()
});`,
  },
  {
    name: 'CRUD In-Memory',
    desc: 'Stateful REST CRUD simulation stored in persistent store',
    code: `store.items = store.items || [
  { id: "1", name: "Alpha Service", active: true },
  { id: "2", name: "Beta Gateway", active: false }
];

if (req.method === 'POST') {
  const newItem = { id: utils.uuid(), ...req.body, createdAt: utils.isoTimestamp() };
  store.items.push(newItem);
  return res.status(201).json(newItem);
}

if (req.method === 'DELETE' && req.params.id) {
  store.items = store.items.filter(item => item.id !== req.params.id);
  return res.status(204).end();
}

res.status(200).json({
  total: store.items.length,
  items: store.items
});`,
  },
  {
    name: 'Simulate Delay',
    desc: 'Simulates network latency with asynchronous sleep',
    code: `// Simulates 800ms latency before responding
await utils.sleep(800);

res.status(200).json({
  status: "success",
  delayedByMs: 800,
  serverTime: utils.isoTimestamp()
});`,
  },
  {
    name: 'Random Failure',
    desc: 'Injects chaos errors (25% chance of 500 error)',
    code: `const roll = utils.randomInt(1, 100);

if (roll <= 25) {
  res.status(500).json({
    error: "Internal Server Error",
    chaosInjected: true,
    roll
  });
} else {
  res.status(200).json({
    status: "healthy",
    roll,
    data: { service: "payment-gateway", status: "operational" }
  });
}`,
  },
  {
    name: 'Bearer Auth',
    desc: 'Validates Authorization header',
    code: `const auth = req.headers['authorization'];

if (!auth || !auth.startsWith('Bearer ')) {
  return res.status(401).json({
    error: "Unauthorized",
    message: "Missing or invalid Bearer token"
  });
}

res.status(200).json({
  status: "authorized",
  user: { id: utils.uuid(), role: "admin" }
});`,
  },
];

export const MockServerRouteEditor: React.FC<MockServerRouteEditorProps> = ({
  currentRoute,
  onUpdateRoute,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
      {/* Route Path & Method Bar */}
      <div className="flex items-center gap-2">
        <HttpMethodDropdown
          method={currentRoute.method}
          onChange={(method: HttpMethod) => onUpdateRoute({ method })}
        />

        <div className="flex-1 relative">
          <Input
            value={currentRoute.path}
            onChange={(e) => onUpdateRoute({ path: e.target.value })}
            placeholder="/api/v1/resource or /users/:id"
            className="font-mono text-xs h-8 pl-3 bg-[#141517]"
          />
        </div>

        {/* Response Mode Segmented Tabs */}
        <div className="flex items-center p-0.5 rounded-md border border-border bg-[#141517] select-none shrink-0">
          <button
            type="button"
            onClick={() => onUpdateRoute({ responseMode: 'static' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              currentRoute.responseMode === 'static'
                ? 'bg-primary text-black font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Static</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateRoute({ responseMode: 'dynamic' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              currentRoute.responseMode === 'dynamic'
                ? 'bg-primary text-black font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Dynamic (JS)</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {currentRoute.responseMode === 'static' ? (
        <MockServerStaticResponse
          currentRoute={currentRoute}
          onUpdateRoute={onUpdateRoute}
        />
      ) : (
        <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
          {/* Dynamic Snippets Bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Snippets:</span>
            </span>
            {DYNAMIC_SNIPPETS.map((snippet) => (
              <Button
                key={snippet.name}
                variant="outline"
                size="sm"
                onClick={() => onUpdateRoute({ dynamicScript: snippet.code })}
                title={snippet.desc}
                className="h-6 px-2 text-[11px] hover:text-primary hover:border-primary/50"
              >
                {snippet.name}
              </Button>
            ))}
          </div>

          {/* Monaco VSCode Code Editor */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <DynamicScriptEditor
              value={currentRoute.dynamicScript}
              onChange={(val) => onUpdateRoute({ dynamicScript: val })}
              minHeight="300px"
            />
          </div>

          {/* Sandbox Runtime Cheat Sheet */}
          <div className="bg-[#1a1b1e] p-2.5 rounded-lg border border-border text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Sandbox Runtime Globals</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
              <div>
                <span className="text-sky-400">req</span>: params, query, body, headers, method, path
              </div>
              <div>
                <span className="text-amber-400">res</span>: status(code), setHeader(k, v), json(obj), send(text)
              </div>
              <div>
                <span className="text-emerald-400">store</span>: Persistent in-memory KV state across requests
              </div>
              <div>
                <span className="text-purple-400">utils</span>: uuid(), isoTimestamp(), timestamp(), randomInt(), sleep()
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
