import React, { useState, useEffect, useMemo } from 'react';
import { MockServer, MockRoute, ServerLogEntry } from '../types/server';
import { MockServerHeader } from './mock-server/MockServerHeader';
import { MockServerRouteList } from './mock-server/MockServerRouteList';
import { MockServerRouteEditor } from './mock-server/MockServerRouteEditor';
import { MockServerTrafficLogs } from './mock-server/MockServerTrafficLogs';
import { MockServerStateStore } from './mock-server/MockServerStateStore';
import { MockServerSettingsModal } from './mock-server/MockServerSettingsModal';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Code2, Activity, Database } from 'lucide-react';

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
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const [storeData, setStoreData] = useState<Record<string, any>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentServer = useMemo(
    () => servers.find((s) => s.id === selectedServerId) || servers[0],
    [servers, selectedServerId]
  );

  const currentRoute = useMemo(
    () => currentServer?.routes.find((r) => r.id === selectedRouteId),
    [currentServer, selectedRouteId]
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

  // IPC listeners for traffic logs and server status
  useEffect(() => {
    const api = (window as any).interceptor?.mockServer;
    if (!api) return;

    const unbindLog = api.onServerLog((log: ServerLogEntry) => {
      setLogs((prev) => [log, ...prev].slice(0, 500));
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

  // Auto-fetch store when switching to store tab
  useEffect(() => {
    if (workbenchTab === 'store' && currentServer) {
      fetchServerStore();
    }
  }, [workbenchTab, currentServer?.id]);

  const handleUpdateServer = (updated: Partial<MockServer>) => {
    if (!currentServer) return;
    const next = servers.map((s) => (s.id === currentServer.id ? { ...s, ...updated } : s));
    onUpdateServers(next);
  };

  const handleToggleServer = async (server: MockServer) => {
    const api = (window as any).interceptor?.mockServer;
    if (server.status === 'running') {
      if (api?.stopServer) {
        await api.stopServer(server.id);
      }
      handleUpdateServer({ status: 'stopped', errorMessage: undefined });
    } else {
      if (api?.startServer) {
        const res = await api.startServer(server);
        if (!res.success) {
          handleUpdateServer({ status: 'error', errorMessage: res.error });
        } else {
          handleUpdateServer({ status: 'running', errorMessage: undefined });
        }
      } else {
        handleUpdateServer({ status: 'running', errorMessage: undefined });
      }
    }
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

  const handleCreateRoute = () => {
    if (!currentServer) return;
    const newRoute: MockRoute = {
      id: `route-${Date.now()}`,
      name: `Route ${currentServer.routes.length + 1}`,
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
      dynamicScript: `// Dynamic route handler\nres.status(200).json({\n  timestamp: utils.isoTimestamp(),\n  query: req.query\n});`,
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

  const handleDeleteRoute = (id: string) => {
    if (!currentServer) return;
    const updatedRoutes = currentServer.routes.filter((r) => r.id !== id);
    handleUpdateServer({ routes: updatedRoutes });
    if (selectedRouteId === id && updatedRoutes.length > 0) {
      setSelectedRouteId(updatedRoutes[0].id);
    }
  };

  const fetchServerStore = async () => {
    const api = (window as any).interceptor?.mockServer;
    if (api?.getStore && currentServer) {
      try {
        const data = await api.getStore(currentServer.id);
        setStoreData(data || {});
      } catch (err: any) {
        console.error('Failed to get store', err);
      }
    }
  };

  const handleClearServerStore = async () => {
    const api = (window as any).interceptor?.mockServer;
    if (api?.clearStore && currentServer) {
      await api.clearStore(currentServer.id);
      setStoreData({});
    }
  };

  const handleSaveServerStore = async (newStore: Record<string, any>) => {
    const api = (window as any).interceptor?.mockServer;
    if (api?.setStore && currentServer) {
      await api.setStore(currentServer.id, newStore);
      setStoreData(newStore);
    }
  };

  const serverLogs = useMemo(
    () => logs.filter((l) => l.serverId === currentServer?.id),
    [logs, currentServer?.id]
  );

  if (!currentServer) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141517] overflow-hidden select-none">
      {/* 1. Header Bar */}
      <MockServerHeader
        servers={servers}
        activeServer={currentServer}
        onSelectServer={(id) => {
          setSelectedServerId(id);
          onSelectServer?.(id);
        }}
        onToggleServer={handleToggleServer}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewServer={handleCreateServer}
        onClose={onClose}
      />

      {/* 2. Main Workbench Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Routes Sidebar */}
        <MockServerRouteList
          server={currentServer}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          onAddRoute={handleCreateRoute}
          onDeleteRoute={handleDeleteRoute}
          searchQuery={routeSearch}
          onSearchChange={setRouteSearch}
        />

        {/* Right: Workbench Views */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#141517]">
          {/* Workbench Tabs Navigation */}
          <div className="px-4 pt-2 border-b border-border bg-[#1a1b1e] shrink-0">
            <Tabs
              value={workbenchTab}
              onValueChange={(v) => setWorkbenchTab(v as any)}
              className="w-full"
            >
              <TabsList className="bg-transparent border-0 p-0 h-auto gap-4">
                <TabsTrigger
                  value="editor"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 pt-1 px-1 text-xs gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Route Definition</span>
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 pt-1 px-1 text-xs gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Traffic Logs ({serverLogs.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="store"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 pt-1 px-1 text-xs gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>State Store</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {workbenchTab === 'editor' && currentRoute && (
              <MockServerRouteEditor
                currentRoute={currentRoute}
                onUpdateRoute={handleUpdateCurrentRoute}
              />
            )}

            {workbenchTab === 'logs' && (
              <MockServerTrafficLogs
                logs={serverLogs}
                onClearLogs={() => setLogs((prev) => prev.filter((l) => l.serverId !== currentServer.id))}
                onReplayInClient={onReplayInClient}
              />
            )}

            {workbenchTab === 'store' && (
              <MockServerStateStore
                store={storeData}
                onRefreshStore={fetchServerStore}
                onClearStore={handleClearServerStore}
                onSaveStore={handleSaveServerStore}
                serverRunning={currentServer.status === 'running'}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. Settings Modal */}
      <MockServerSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        server={currentServer}
        onSave={handleUpdateServer}
      />
    </div>
  );
};
