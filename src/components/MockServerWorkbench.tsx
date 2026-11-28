import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MockServer,
  MockRoute,
  ServerLogEntry,
  RouteResponseMode,
} from '../types/server';
import { HttpMethod } from '../types';
import { HttpMethodDropdown } from './HttpMethodDropdown';
import { MockServerSelectorDropdown } from './MockServerSelectorDropdown';
import { DynamicScriptEditor } from './DynamicScriptEditor';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Code2,
  FileText,
  Clock,
  Radio,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Database,
  Send,
  RotateCcw,
} from 'lucide-react';

interface MockServerWorkbenchProps {
  servers: MockServer[];
  onUpdateServers: (servers: MockServer[]) => void;
  activeServerId?: string;
  onSelectServer?: (serverId: string) => void;
  onClose?: () => void;
  onReplayInClient?: (log: ServerLogEntry) => void;
}

export const MockServerWorkbench: React.FC<MockServerWorkbenchProps> = ({
  servers,
  onUpdateServers,
  activeServerId,
  onSelectServer,
  onClose,
  onReplayInClient,
}) => {
  const [selectedServerId, setSelectedServerId] = useState<string>(
    activeServerId || servers[0]?.id || ''
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [workbenchTab, setWorkbenchTab] = useState<'editor' | 'logs' | 'store'>('editor');
  const [routeSearch, setRouteSearch] = useState<string>('');
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [isStartingServer, setIsStartingServer] = useState<boolean>(false);
  const [newHeaderKey, setNewHeaderKey] = useState<string>('');
  const [newHeaderVal, setNewHeaderVal] = useState<string>('');
  const [logFilter, setLogFilter] = useState<'all' | '2xx' | '4xx' | '5xx' | 'proxied'>('all');

  // Phase 2: In-Memory Store state
  const [storeData, setStoreData] = useState<Record<string, any>>({});
  const [storeJsonInput, setStoreJsonInput] = useState<string>('{}');
  const [isEditingStore, setIsEditingStore] = useState<boolean>(false);
  const [storeFeedback, setStoreFeedback] = useState<string | null>(null);

  const currentServer = useMemo(
    () => servers.find((s) => s.id === selectedServerId) || servers[0],
    [servers, selectedServerId]
  );

  useEffect(() => {
    if (activeServerId && activeServerId !== selectedServerId) {
      setSelectedServerId(activeServerId);
    }
  }, [activeServerId]);

  useEffect(() => {
    if (currentServer && (!selectedRouteId || !currentServer.routes.find((r) => r.id === selectedRouteId))) {
      if (currentServer.routes.length > 0) {
        setSelectedRouteId(currentServer.routes[0].id);
      } else {
        setSelectedRouteId('');
      }
    }
  }, [currentServer, selectedRouteId]);

  // Listen to Electron mock server IPC logs & status changes
  useEffect(() => {
    const api = (window as any).interceptor?.mockServer;
    if (!api) return;

    const unbindLog = api.onServerLog((log: ServerLogEntry) => {
      setLogs((prev) => [log, ...prev].slice(0, 500));
      // update hit counts on the server
      onUpdateServers(
        servers.map((s) => {
          if (s.id !== log.serverId) return s;
          return {
            ...s,
            routes: s.routes.map((r) => {
              if (r.id !== log.matchedRouteId) return r;
              return { ...r, hitCount: (r.hitCount || 0) + 1, lastHitAt: log.timestamp };
            }),
          };
        })
      );
    });

    const unbindStatus = api.onServerStatusChange(
      (data: { serverId: string; status: 'stopped' | 'running' | 'error'; error?: string }) => {
        setIsStartingServer(false);
        onUpdateServers(
          servers.map((s) => {
            if (s.id !== data.serverId) return s;
            return {
              ...s,
              status: data.status,
              errorMessage: data.error,
            };
          })
        );
      }
    );

    return () => {
      unbindLog?.();
      unbindStatus?.();
    };
  }, [servers, onUpdateServers]);

  const currentRoute = useMemo(
    () => currentServer?.routes.find((r) => r.id === selectedRouteId),
    [currentServer, selectedRouteId]
  );

  const filteredRoutes = useMemo(() => {
    if (!currentServer) return [];
    if (!routeSearch.trim()) return currentServer.routes;
    const q = routeSearch.toLowerCase();
    return currentServer.routes.filter(
      (r) => r.path.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.method.toLowerCase().includes(q)
    );
  }, [currentServer, routeSearch]);

  const filteredLogs = useMemo(() => {
    if (!currentServer) return [];
    let serverLogs = logs.filter((l) => l.serverId === currentServer.id);
    if (logFilter === '2xx') {
      serverLogs = serverLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300);
    } else if (logFilter === '4xx') {
      serverLogs = serverLogs.filter((l) => l.statusCode >= 400 && l.statusCode < 500);
    } else if (logFilter === '5xx') {
      serverLogs = serverLogs.filter((l) => l.statusCode >= 500);
    } else if (logFilter === 'proxied') {
      serverLogs = serverLogs.filter((l) => l.isProxied);
    }
    if (!logsSearch.trim()) return serverLogs;
    const q = logsSearch.toLowerCase();
    return serverLogs.filter((l) => l.path.toLowerCase().includes(q) || l.method.toLowerCase().includes(q));
  }, [logs, currentServer, logsSearch, logFilter]);

  // Server management actions
  const handleUpdateServer = (updated: Partial<MockServer>) => {
    if (!currentServer) return;
    const next = servers.map((s) => (s.id === currentServer.id ? { ...s, ...updated } : s));
    onUpdateServers(next);
  };

  const handleStartServer = async () => {
    if (!currentServer) return;
    setIsStartingServer(true);

    const api = (window as any).interceptor?.mockServer;
    if (api?.startServer) {
      const res = await api.startServer(currentServer);
      setIsStartingServer(false);
      if (!res.success) {
        handleUpdateServer({ status: 'error', errorMessage: res.error });
      } else {
        handleUpdateServer({ status: 'running', errorMessage: undefined });
      }
    } else {
      // Browser fallback simulation
      setTimeout(() => {
        setIsStartingServer(false);
        handleUpdateServer({ status: 'running', errorMessage: undefined });
      }, 300);
    }
  };

  const handleStopServer = async () => {
    if (!currentServer) return;
    const api = (window as any).interceptor?.mockServer;
    if (api?.stopServer) {
      await api.stopServer(currentServer.id);
    }
    handleUpdateServer({ status: 'stopped', errorMessage: undefined });
  };

  const handleCreateServer = () => {
    const newPort = Math.max(...servers.map((s) => s.port || 3000), 3000) + 1;
    const newServer: MockServer = {
      id: `server-${Date.now()}`,
      name: `Mock Server ${servers.length + 1}`,
      port: newPort,
      prefix: '',
      corsEnabled: true,
      defaultDelayMs: 0,
      status: 'stopped',
      routes: [
        {
          id: `route-${Date.now()}-1`,
          name: 'Welcome Endpoint',
          method: 'GET',
          path: '/api/welcome',
          enabled: true,
          responseMode: 'static',
          delayMs: 0,
          staticResponse: {
            statusCode: 200,
            headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }],
            body: JSON.stringify({ message: 'Welcome to Interceptor Mock Server!' }, null, 2),
          },
          dynamicScript: 'res.json({ message: "Welcome to Interceptor Dynamic Server!" });',
          hitCount: 0,
        },
      ],
      createdAt: Date.now(),
    };

    const next = [...servers, newServer];
    onUpdateServers(next);
    setSelectedServerId(newServer.id);
    setSelectedRouteId(newServer.routes[0].id);
    onSelectServer?.(newServer.id);
  };

  const handleDeleteServer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (servers.length <= 1) return;
    handleStopServer();
    const next = servers.filter((s) => s.id !== id);
    onUpdateServers(next);
    if (selectedServerId === id) {
      setSelectedServerId(next[0].id);
      onSelectServer?.(next[0].id);
    }
  };

  // Route management actions
  const handleCreateRoute = () => {
    if (!currentServer) return;
    const newRoute: MockRoute = {
      id: `route-${Date.now()}`,
      name: `New Route ${currentServer.routes.length + 1}`,
      method: 'GET',
      path: `/api/resource-${currentServer.routes.length + 1}`,
      enabled: true,
      responseMode: 'static',
      delayMs: 0,
      staticResponse: {
        statusCode: 200,
        headers: [{ id: `h-${Date.now()}`, key: 'Content-Type', value: 'application/json', enabled: true }],
        body: JSON.stringify({ status: 'ok', data: [] }, null, 2),
      },
      dynamicScript: `// Dynamic route handler\nres.status(200).json({\n  timestamp: new Date().toISOString(),\n  query: req.query\n});`,
      hitCount: 0,
    };

    const updatedRoutes = [...currentServer.routes, newRoute];
    handleUpdateServer({ routes: updatedRoutes });
    setSelectedRouteId(newRoute.id);
  };

  const handleUpdateCurrentRoute = (updated: Partial<MockRoute>) => {
    if (!currentServer || !currentRoute) return;
    const updatedRoutes = currentServer.routes.map((r) =>
      r.id === currentRoute.id ? { ...r, ...updated } : r
    );
    handleUpdateServer({ routes: updatedRoutes });
  };

  const handleDeleteRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentServer) return;
    const updatedRoutes = currentServer.routes.filter((r) => r.id !== id);
    handleUpdateServer({ routes: updatedRoutes });
    if (selectedRouteId === id && updatedRoutes.length > 0) {
      setSelectedRouteId(updatedRoutes[0].id);
    }
  };

  const handleToggleRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentServer) return;
    const updatedRoutes = currentServer.routes.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    handleUpdateServer({ routes: updatedRoutes });
  };

  // Prettify JSON body
  const handlePrettifyBody = () => {
    if (!currentRoute?.staticResponse?.body) return;
    try {
      const parsed = JSON.parse(currentRoute.staticResponse.body);
      handleUpdateCurrentRoute({
        staticResponse: {
          ...currentRoute.staticResponse,
          body: JSON.stringify(parsed, null, 2),
        },
      });
    } catch {
      // not valid json, ignore
    }
  };

  // Copy server base URL
  const handleCopyBaseUrl = () => {
    if (!currentServer) return;
    const url = `http://localhost:${currentServer.port}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Phase 2: Store Management
  const fetchServerStore = async () => {
    if (window.interceptor?.mockServer?.getStore && currentServer) {
      try {
        const data = await window.interceptor.mockServer.getStore(currentServer.id);
        setStoreData(data || {});
        setStoreJsonInput(JSON.stringify(data || {}, null, 2));
      } catch (err: any) {
        console.error('Failed to get store', err);
      }
    }
  };

  const handleClearServerStore = async () => {
    if (window.interceptor?.mockServer?.clearStore && currentServer) {
      await window.interceptor.mockServer.clearStore(currentServer.id);
      setStoreData({});
      setStoreJsonInput('{}');
      setStoreFeedback('Store cleared');
      setTimeout(() => setStoreFeedback(null), 2000);
    }
  };

  const handleSaveServerStore = async () => {
    if (window.interceptor?.mockServer?.setStore && currentServer) {
      try {
        const parsed = JSON.parse(storeJsonInput);
        await window.interceptor.mockServer.setStore(currentServer.id, parsed);
        setStoreData(parsed);
        setIsEditingStore(false);
        setStoreFeedback('Store updated successfully');
        setTimeout(() => setStoreFeedback(null), 2000);
      } catch (err: any) {
        setStoreFeedback(`Invalid JSON: ${err.message}`);
      }
    }
  };

  // Phase 2: Copy cURL from Traffic Log
  const handleCopyCurl = (log: ServerLogEntry) => {
    const fullUrl = `http://localhost:${currentServer.port}${log.path}${
      Object.keys(log.requestQuery || {}).length > 0 ? '?' + new URLSearchParams(log.requestQuery).toString() : ''
    }`;
    let cmd = `curl -X ${log.method} "${fullUrl}"`;
    for (const [k, v] of Object.entries(log.requestHeaders || {})) {
      if (!k.startsWith(':') && k.toLowerCase() !== 'host' && k.toLowerCase() !== 'content-length') {
        cmd += ` \\\n  -H "${k}: ${v}"`;
      }
    }
    if (log.requestBody) {
      const bodyStr = typeof log.requestBody === 'object' ? JSON.stringify(log.requestBody) : String(log.requestBody);
      cmd += ` \\\n  -d '${bodyStr}'`;
    }
    navigator.clipboard.writeText(cmd);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Phase 2: Dynamic Script Templates
  const DYNAMIC_SNIPPETS = [
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

  // Helper method badge color
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-[#61afef] bg-[#61afef]/10 border-[#61afef]/30';
      case 'POST':
        return 'text-[#e5c07b] bg-[#e5c07b]/10 border-[#e5c07b]/30';
      case 'PUT':
        return 'text-[#c678dd] bg-[#c678dd]/10 border-[#c678dd]/30';
      case 'DELETE':
        return 'text-[#ef596f] bg-[#ef596f]/10 border-[#ef596f]/30';
      case 'PATCH':
        return 'text-[#98c379] bg-[#98c379]/10 border-[#98c379]/30';
      default:
        return 'text-[#abb2bf] bg-[#abb2bf]/10 border-[#abb2bf]/30';
    }
  };

  if (!currentServer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1a1a1a] text-[#cccccc]">
        <AlertCircle className="w-8 h-8 text-[#d99b26] mb-3" />
        <h2 className="text-base font-semibold mb-1">No Mock Servers Found</h2>
        <button
          onClick={handleCreateServer}
          className="mt-4 px-3 py-1.5 bg-[#d99b26] text-black font-semibold rounded text-xs hover:bg-[#e5a730]"
        >
          Create Mock Server
        </button>
      </div>
    );
  }

  const isRunning = currentServer.status === 'running';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-[#cccccc] font-sans select-none overflow-hidden">
      {/* Top Header: Server Selector, Port, Control Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#222224] border-b border-[#333333] shrink-0 gap-4">
        {/* Left Side: Server Dropdown / Title & Status */}
        <div className="flex items-center gap-2">
          <MockServerSelectorDropdown
            servers={servers}
            selectedServerId={currentServer.id}
            onSelectServer={(id) => {
              setSelectedServerId(id);
              onSelectServer?.(id);
            }}
            onCreateServer={handleCreateServer}
          />

          <button
            type="button"
            onClick={handleCreateServer}
            className="p-1 text-[#888888] hover:text-[#d99b26] hover:bg-[#26292b] rounded transition-colors"
            title="Create another mock server"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#333333]">
            {isRunning ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Running on http://localhost:{currentServer.port}</span>
                {currentServer.proxyFallbackEnabled && currentServer.proxyFallbackUrl && (
                  <span className="text-[9px] text-purple-300 bg-purple-500/20 px-1 py-0.2 rounded font-mono border border-purple-500/30 ml-1">
                    Hybrid Proxy
                  </span>
                )}
              </div>
            ) : currentServer.status === 'error' ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 font-medium">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="truncate max-w-[280px]" title={currentServer.errorMessage}>
                  {currentServer.errorMessage || 'Server Error'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#26292b] border border-[#444444] text-[11px] text-[#888888]">
                <span className="w-2 h-2 rounded-full bg-[#666666]" />
                <span>Stopped</span>
              </div>
            )}

            {/* Copy Base URL */}
            <button
              type="button"
              onClick={handleCopyBaseUrl}
              className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors"
              title="Copy base URL to clipboard"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center / Right: Port Config & Start/Stop Controls */}
        <div className="flex items-center gap-3">
          {/* Port Input */}
          <div className="flex items-center gap-1.5 text-xs text-[#888888]">
            <span>Port:</span>
            <input
              type="number"
              disabled={isRunning}
              value={currentServer.port}
              onChange={(e) => handleUpdateServer({ port: parseInt(e.target.value) || 3000 })}
              className={`w-16 px-2 py-0.5 rounded bg-[#1a1a1a] border text-xs font-mono text-center focus:outline-none ${
                isRunning ? 'border-[#333333] text-[#888888]' : 'border-[#444444] text-white focus:border-[#d99b26]'
              }`}
            />
          </div>

          {/* CORS Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-[#888888] cursor-pointer" title="Auto-respond to OPTIONS requests with CORS headers">
            <input
              type="checkbox"
              checked={currentServer.corsEnabled}
              onChange={(e) => handleUpdateServer({ corsEnabled: e.target.checked })}
              className="accent-[#d99b26] rounded cursor-pointer"
            />
            <span>CORS</span>
          </label>

          {/* Phase 2: Proxy Fallback Toggle & Target URL */}
          <div className="flex items-center gap-1.5 text-xs text-[#888888]">
            <label className="flex items-center gap-1 cursor-pointer" title="Forward unmatched routes to a real upstream backend">
              <input
                type="checkbox"
                checked={!!currentServer.proxyFallbackEnabled}
                onChange={(e) => handleUpdateServer({ proxyFallbackEnabled: e.target.checked })}
                className="accent-[#d99b26] rounded cursor-pointer"
              />
              <span>Proxy Fallback:</span>
            </label>
            {currentServer.proxyFallbackEnabled && (
              <input
                type="text"
                value={currentServer.proxyFallbackUrl || ''}
                onChange={(e) => handleUpdateServer({ proxyFallbackUrl: e.target.value })}
                placeholder="https://api.example.com"
                className="w-44 px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#444444] text-xs font-mono text-white focus:outline-none focus:border-[#d99b26]"
                title="Target upstream URL (e.g. https://api.example.com)"
              />
            )}
          </div>

          {/* Start / Stop Toggle Button */}
          {isRunning ? (
            <button
              type="button"
              onClick={handleStopServer}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              <span>Stop Server</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isStartingServer}
              onClick={handleStartServer}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-black hover:bg-emerald-400 rounded text-xs font-semibold transition-colors shadow cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-black" />
              <span>{isStartingServer ? 'Starting...' : 'Start Server'}</span>
            </button>
          )}

          {/* Delete Server (if more than 1) */}
          {servers.length > 1 && (
            <button
              type="button"
              onClick={(e) => handleDeleteServer(currentServer.id, e)}
              className="p-1 text-[#666666] hover:text-rose-400 rounded hover:bg-[#26292b] transition-colors ml-1"
              title="Delete this server"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workbench Layout: Left Routes List | Right Route Editor & Logs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Routes Navigator */}
        <div className="w-72 border-r border-[#333333] flex flex-col bg-[#1a1a1a] shrink-0">
          {/* Header & Search */}
          <div className="p-2 border-b border-[#333333] flex items-center justify-between gap-2 bg-[#222224]/50">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-[#666666] absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter routes..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded pl-7 pr-2 py-0.5 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#d99b26]"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateRoute}
              className="flex items-center gap-1 px-2 py-1 bg-[#d99b26]/10 text-[#d99b26] border border-[#d99b26]/30 hover:bg-[#d99b26]/20 rounded text-xs font-medium transition-colors"
              title="Add Route"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Routes List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredRoutes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    setWorkbenchTab('editor');
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors border group ${
                    isSelected
                      ? 'bg-[#26292b] border-[#d99b26]/40 text-white'
                      : 'border-transparent hover:bg-[#222224] text-[#cccccc]'
                  } ${!route.enabled ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                    {/* Method badge */}
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${getMethodBadgeClass(
                        route.method
                      )}`}
                    >
                      {route.method}
                    </span>

                    {/* Path & Name */}
                    <div className="flex flex-col truncate">
                      <span className="font-mono text-xs truncate font-medium text-white">{route.path}</span>
                      <span className="text-[10px] text-[#777777] truncate">{route.name}</span>
                    </div>
                  </div>

                  {/* Actions & Hit Count */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {route.hitCount > 0 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#333333] text-[#888888] font-mono">
                        {route.hitCount}
                      </span>
                    )}

                    {/* Enable Toggle */}
                    <input
                      type="checkbox"
                      checked={route.enabled}
                      onChange={(e) => handleToggleRoute(route.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-[#d99b26] cursor-pointer"
                      title={route.enabled ? 'Route enabled' : 'Route disabled'}
                    />

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRoute(route.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#666666] hover:text-rose-400 transition-opacity"
                      title="Delete route"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredRoutes.length === 0 && (
              <div className="text-center py-8 text-xs text-[#666666]">
                No routes match search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Route Configuration & Traffic Logs */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
          {/* Subtab Bar */}
          <div className="flex items-center justify-between px-4 bg-[#222224] border-b border-[#333333] shrink-0 h-9">
            <div className="flex items-center h-full gap-5">
              <button
                type="button"
                onClick={() => setWorkbenchTab('editor')}
                className={`h-full text-xs transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 font-medium ${
                  workbenchTab === 'editor'
                    ? 'border-[#d99b26] text-white'
                    : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Route Definition</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkbenchTab('logs')}
                className={`h-full text-xs transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 font-medium ${
                  workbenchTab === 'logs'
                    ? 'border-[#d99b26] text-white'
                    : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Traffic Logs</span>
                {filteredLogs.length > 0 && (
                  <sup className="font-semibold text-[10px] text-[#d99b26] ml-0.5">{filteredLogs.length}</sup>
                )}
              </button>

              {/* Phase 2: State Store Tab */}
              <button
                type="button"
                onClick={() => {
                  setWorkbenchTab('store');
                  fetchServerStore();
                }}
                className={`h-full text-xs transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 font-medium ${
                  workbenchTab === 'store'
                    ? 'border-[#d99b26] text-white'
                    : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>State Store</span>
                {Object.keys(storeData || {}).length > 0 && (
                  <sup className="font-semibold text-[10px] text-emerald-400 ml-0.5">
                    {Object.keys(storeData).length}
                  </sup>
                )}
              </button>
            </div>

            {/* Quick Link to Test Route in Request Workbench */}
            {currentRoute && (
              <div className="text-xs text-[#888888] font-mono flex items-center gap-1">
                <span>URL:</span>
                <span className="text-[#d99b26]">
                  http://localhost:{currentServer.port}
                  {currentRoute.path}
                </span>
              </div>
            )}
          </div>

          {/* Workbench Tab 1: Route Editor */}
          {workbenchTab === 'editor' && currentRoute && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
              {/* Row 1: Method, Path, Name, Latency */}
              <div className="flex items-center gap-3 bg-[#222224] p-3 rounded border border-[#333333]">
                {/* Method selector */}
                <HttpMethodDropdown
                  method={currentRoute.method}
                  onChange={(m) => handleUpdateCurrentRoute({ method: m as any })}
                  includeAll
                />

                {/* Path input */}
                <div className="flex-1 flex items-center gap-1 bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1 text-xs">
                  <span className="text-[#666666] font-mono">/</span>
                  <input
                    type="text"
                    value={currentRoute.path.replace(/^\//, '')}
                    onChange={(e) =>
                      handleUpdateCurrentRoute({
                        path: e.target.value.startsWith('/') ? e.target.value : `/${e.target.value}`,
                      })
                    }
                    placeholder="users or users/:id"
                    className="w-full bg-transparent font-mono text-white focus:outline-none"
                  />
                </div>

                {/* Route Name */}
                <input
                  type="text"
                  value={currentRoute.name}
                  onChange={(e) => handleUpdateCurrentRoute({ name: e.target.value })}
                  placeholder="Route Label (e.g. Get All Users)"
                  className="w-48 bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d99b26]"
                />

                {/* Delay ms */}
                <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs text-[#888888]">
                  <span>Delay:</span>
                  <input
                    type="number"
                    value={currentRoute.delayMs}
                    onChange={(e) => handleUpdateCurrentRoute({ delayMs: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 bg-transparent text-white font-mono text-center focus:outline-none"
                  />
                  <span>ms</span>
                </div>
              </div>

              {/* Row 2: Response Mode Switcher */}
              <div className="flex items-center justify-between border-b border-[#333333] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#888888] font-medium">Response Engine:</span>
                  <div className="flex items-center bg-[#222224] p-0.5 rounded border border-[#333333]">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRoute({ responseMode: 'static' })}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        currentRoute.responseMode === 'static'
                          ? 'bg-[#d99b26] text-black font-semibold'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Static Response</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRoute({ responseMode: 'dynamic' })}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                        currentRoute.responseMode === 'dynamic'
                          ? 'bg-[#d99b26] text-black font-semibold'
                          : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Dynamic Code (Express-style)</span>
                    </button>
                  </div>
                </div>

                {currentRoute.responseMode === 'static' && (
                  <button
                    type="button"
                    onClick={handlePrettifyBody}
                    className="text-xs text-[#d99b26] hover:text-[#e5a730] transition-colors"
                  >
                    Prettify JSON
                  </button>
                )}
              </div>

              {/* Mode A: Static Response Config */}
              {currentRoute.responseMode === 'static' ? (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Status Code Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888888] font-medium">HTTP Status Code:</span>
                    <input
                      type="number"
                      value={currentRoute.staticResponse.statusCode}
                      onChange={(e) =>
                        handleUpdateCurrentRoute({
                          staticResponse: {
                            ...currentRoute.staticResponse,
                            statusCode: parseInt(e.target.value) || 200,
                          },
                        })
                      }
                      className="w-18 bg-[#222224] border border-[#333333] rounded px-2 py-1 text-xs text-center font-mono font-bold text-white focus:outline-none focus:border-[#d99b26]"
                    />
                    <div className="flex items-center gap-1 ml-2">
                      {[200, 201, 400, 404, 500].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() =>
                            handleUpdateCurrentRoute({
                              staticResponse: {
                                ...currentRoute.staticResponse,
                                statusCode: code,
                              },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            currentRoute.staticResponse.statusCode === code
                              ? 'bg-[#d99b26]/20 border-[#d99b26] text-[#d99b26]'
                              : 'bg-[#222224] border-[#333333] text-[#888888] hover:text-white'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Response Body Editor */}
                  <div className="flex-1 flex flex-col min-h-[220px]">
                    <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
                      <span>Response Body (JSON / Text):</span>
                      <span className="text-[11px] text-[#666666]">
                        Tips: Use <code className="text-[#d99b26]">{`{{params.id}}`}</code> or <code className="text-[#d99b26]">{`{{query.search}}`}</code>
                      </span>
                    </div>
                    <textarea
                      value={currentRoute.staticResponse.body}
                      onChange={(e) =>
                        handleUpdateCurrentRoute({
                          staticResponse: {
                            ...currentRoute.staticResponse,
                            body: e.target.value,
                          },
                        })
                      }
                      spellCheck={false}
                      className="flex-1 w-full p-3 font-mono text-xs leading-5 bg-[#141517] border border-[#333333] rounded text-[#cccccc] focus:outline-none focus:border-[#d99b26] resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Mode B: Dynamic JavaScript Execution */
                <div className="flex-1 flex flex-col space-y-3">
                  {/* Phase 2: Dynamic Snippets Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#888888] flex items-center gap-1 font-medium mr-1">
                      <Sparkles className="w-3 h-3 text-[#d99b26]" />
                      <span>Snippets:</span>
                    </span>
                    {DYNAMIC_SNIPPETS.map((snippet) => (
                      <button
                        key={snippet.name}
                        type="button"
                        onClick={() => handleUpdateCurrentRoute({ dynamicScript: snippet.code })}
                        className="px-2 py-0.5 rounded bg-[#222224] hover:bg-[#26292b] border border-[#333333] hover:border-[#444444] text-[11px] text-[#cccccc] hover:text-[#d99b26] transition-colors cursor-pointer"
                        title={snippet.desc}
                      >
                        {snippet.name}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Script Editor (VSCode-style with Monaco & IntelliSense) */}
                  <div className="flex-1 flex flex-col min-h-[300px]">
                    <DynamicScriptEditor
                      value={currentRoute.dynamicScript}
                      onChange={(val) => handleUpdateCurrentRoute({ dynamicScript: val })}
                      minHeight="300px"
                    />
                  </div>

                  {/* Sandbox API Cheat Sheet */}
                  <div className="bg-[#222224]/80 p-2.5 rounded border border-[#333333] text-[11px] text-[#888888] space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <Info className="w-3.5 h-3.5 text-[#d99b26]" />
                      <span>Available Runtime Globals</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                      <div>
                        <span className="text-[#61afef]">req</span>: params, query, body, headers, method, path
                      </div>
                      <div>
                        <span className="text-[#e5c07b]">res</span>: status(code), setHeader(k, v), json(obj), send(text)
                      </div>
                      <div>
                        <span className="text-[#98c379]">store</span>: Shared in-memory KV state across requests
                      </div>
                      <div>
                        <span className="text-[#c678dd]">utils</span>: uuid(), isoTimestamp(), timestamp(), randomInt(min, max), sleep(ms)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workbench Tab 2: Traffic Logs */}
          {workbenchTab === 'logs' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
              {/* Logs Controls */}
              <div className="flex items-center justify-between gap-3 bg-[#222224] p-2 rounded border border-[#333333]">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 text-[#666666] absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search traffic logs..."
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333333] rounded pl-8 pr-2 py-1 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Phase 2: Log Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  {(['all', '2xx', '4xx', '5xx', 'proxied'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLogFilter(filter)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        logFilter === filter
                          ? 'bg-[#d99b26] text-black font-semibold'
                          : 'bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#333333]'
                      }`}
                    >
                      {filter === 'all'
                        ? 'All'
                        : filter === 'proxied'
                        ? 'Proxied'
                        : filter.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[#888888] hover:text-white rounded transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              {/* Logs List */}
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                  const isClientErr = log.statusCode >= 400 && log.statusCode < 500;
                  const isServerErr = log.statusCode >= 500;

                  return (
                    <div
                      key={log.id}
                      className="border border-[#333333] rounded bg-[#222224]/50 hover:bg-[#222224] transition-colors overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getMethodBadgeClass(
                              log.method
                            )}`}
                          >
                            {log.method}
                          </span>
                          <span className="text-white font-medium">{log.path}</span>
                          {Object.keys(log.requestQuery).length > 0 && (
                            <span className="text-[#888888] text-[11px]">
                              ?{new URLSearchParams(log.requestQuery).toString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Phase 2: Proxied badge */}
                          {log.isProxied && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              PROXIED
                            </span>
                          )}

                          {/* Status code pill */}
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                              isSuccess
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isClientErr
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {log.statusCode}
                          </span>

                          <span className="text-[11px] font-mono text-[#777777]">{log.durationMs}ms</span>
                          <span className="text-[10px] text-[#666666]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>

                          {/* Phase 2: Quick Replay in Client & cURL Actions */}
                          {onReplayInClient && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplayInClient(log);
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[10px] text-[#cccccc] hover:text-[#d99b26] transition-colors cursor-pointer"
                              title="Open this request in Client Workbench"
                            >
                              <ExternalLink className="w-3 h-3 text-[#d99b26]" />
                              <span>Replay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCurl(log);
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[10px] text-[#cccccc] hover:text-white transition-colors cursor-pointer"
                            title="Copy request as cURL command"
                          >
                            {copiedLogId === log.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>cURL</span>
                          </button>

                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Expanded Log Inspector */}
                      {isExpanded && (
                        <div className="p-3 border-t border-[#333333] bg-[#141517] text-xs font-mono space-y-3">
                          {/* Phase 2: Proxied notice */}
                          {log.isProxied && log.proxyTargetUrl && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 text-[11px] text-purple-300">
                              <span className="font-semibold">Forwarded to Upstream Target: </span>
                              <span className="font-mono">{log.proxyTargetUrl}</span>
                            </div>
                          )}

                          {/* Query & Params */}
                          {Object.keys(log.requestQuery).length > 0 && (
                            <div>
                              <span className="text-[#888888] text-[11px] font-semibold block mb-1">Query Parameters:</span>
                              <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-[#cccccc] overflow-x-auto">
                                {JSON.stringify(log.requestQuery, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Request Body */}
                          {log.requestBody && (
                            <div>
                              <span className="text-[#888888] text-[11px] font-semibold block mb-1">Request Body:</span>
                              <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-[#cccccc] overflow-x-auto">
                                {typeof log.requestBody === 'object'
                                  ? JSON.stringify(log.requestBody, null, 2)
                                  : String(log.requestBody)}
                              </pre>
                            </div>
                          )}

                          {/* Response Payload Preview */}
                          {log.responseBodyPreview && (
                            <div>
                              <span className="text-[#888888] text-[11px] font-semibold block mb-1">Served Response Body:</span>
                              <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-emerald-300 overflow-x-auto">
                                {log.responseBodyPreview}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <div className="text-center py-12 text-xs text-[#666666]">
                    No traffic logged yet. Send a request to{' '}
                    <code className="text-[#d99b26]">http://localhost:{currentServer.port}</code> to see live logs!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Workbench Tab 3: State Store */}
          {workbenchTab === 'store' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
              {/* Header Toolbar */}
              <div className="flex items-center justify-between gap-3 bg-[#222224] p-3 rounded border border-[#333333]">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[#d99b26]" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">In-Memory State Store</span>
                    <span className="text-[11px] text-[#777777]">
                      Shared key-value state persisted across requests during server runtime via <code className="text-[#98c379]">store</code>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {storeFeedback && (
                    <span className="text-xs text-emerald-400 font-medium animate-in fade-in duration-100">
                      {storeFeedback}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchServerStore}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[#cccccc] hover:text-white rounded transition-colors cursor-pointer"
                    title="Refresh store contents from server"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingStore(!isEditingStore);
                      setStoreJsonInput(JSON.stringify(storeData, null, 2));
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded transition-colors cursor-pointer ${
                      isEditingStore
                        ? 'bg-[#d99b26] text-black border-[#d99b26] font-semibold'
                        : 'bg-[#1a1a1a] hover:bg-[#26292b] border-[#333333] text-[#cccccc] hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>{isEditingStore ? 'Cancel Edit' : 'Seed / Edit JSON'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearServerStore}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-rose-500/10 border border-[#333333] hover:border-rose-500/30 text-[#888888] hover:text-rose-400 rounded transition-colors cursor-pointer"
                    title="Clear in-memory store"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Store</span>
                  </button>
                </div>
              </div>

              {/* Store Content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#141517] border border-[#333333] rounded p-3">
                {isEditingStore ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#888888]">
                      <span>Edit store JSON below and click Apply:</span>
                      <button
                        type="button"
                        onClick={handleSaveServerStore}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs transition-colors cursor-pointer"
                      >
                        Apply Store Data
                      </button>
                    </div>
                    <textarea
                      value={storeJsonInput}
                      onChange={(e) => setStoreJsonInput(e.target.value)}
                      className="flex-1 w-full p-3 font-mono text-xs leading-5 bg-[#1a1a1a] border border-[#333333] rounded text-[#cccccc] focus:outline-none focus:border-[#d99b26] resize-none"
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    {Object.keys(storeData).length > 0 ? (
                      <pre className="font-mono text-xs text-emerald-300 leading-relaxed">
                        {JSON.stringify(storeData, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-16 text-xs text-[#666666] space-y-2">
                        <Database className="w-8 h-8 text-[#444444] mx-auto" />
                        <div>In-memory store is currently empty.</div>
                        <div className="text-[11px] text-[#555555]">
                          Use <code className="text-[#98c379]">store.items = [...]</code> in a dynamic script or click <strong>Seed / Edit JSON</strong> to initialize data.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
