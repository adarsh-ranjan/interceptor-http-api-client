import React, { useState, useEffect, useMemo } from 'react';
import {
  MockServer,
  MockRoute,
  ServerLogEntry,
} from '../../types/server';
import { MockServerHeader } from './MockServerHeader';
import { MockServerRouteList } from './MockServerRouteList';
import { MockServerRouteEditor } from './MockServerRouteEditor';
import { MockServerTrafficLogs } from './MockServerTrafficLogs';
import { MockServerStateStore } from './MockServerStateStore';
import { MockServerSettingsModal } from './MockServerSettingsModal';

export interface MockServerWorkbenchProps {
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
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // In-Memory Store state
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
      (r) => r.path.toLowerCase().includes(q) || r.method.toLowerCase().includes(q)
    );
  }, [currentServer, routeSearch]);

  const handleToggleServer = async () => {
    if (!currentServer) return;
    const api = (window as any).interceptor?.mockServer;
    if (!api) return;

    setIsStartingServer(true);
    if (currentServer.status === 'running') {
      await api.stop(currentServer.id);
      setIsStartingServer(false);
      onUpdateServers(
        servers.map((s) => (s.id === currentServer.id ? { ...s, status: 'stopped' } : s))
      );
    } else {
      const res = await api.start(currentServer);
      setIsStartingServer(false);
      if (res.success) {
        onUpdateServers(
          servers.map((s) => (s.id === currentServer.id ? { ...s, status: 'running' } : s))
        );
      } else {
        alert(`Failed to start mock server: ${res.error}`);
      }
    }
  };

  const handleUpdateRoute = (updatedRoute: MockRoute) => {
    onUpdateServers(
      servers.map((s) => {
        if (s.id !== currentServer.id) return s;
        return {
          ...s,
          routes: s.routes.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)),
        };
      })
    );
  };

  const handleAddRoute = () => {
    const newRoute: MockRoute = {
      id: `route-${Date.now()}`,
      method: 'GET',
      path: `/api/resource-${currentServer.routes.length + 1}`,
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      responseBody: '{\n  "message": "Success"\n}',
      responseMode: 'static',
      delayMs: 0,
    };

    onUpdateServers(
      servers.map((s) => {
        if (s.id !== currentServer.id) return s;
        return {
          ...s,
          routes: [...s.routes, newRoute],
        };
      })
    );
    setSelectedRouteId(newRoute.id);
  };

  const handleDeleteRoute = (routeId: string) => {
    if (currentServer.routes.length <= 1) {
      alert('Mock server must have at least one route.');
      return;
    }
    const remaining = currentServer.routes.filter((r) => r.id !== routeId);
    onUpdateServers(
      servers.map((s) => {
        if (s.id !== currentServer.id) return s;
        return { ...s, routes: remaining };
      })
    );
    if (selectedRouteId === routeId) {
      setSelectedRouteId(remaining[0].id);
    }
  };

  const handleAddHeader = () => {
    if (!currentRoute || !newHeaderKey.trim()) return;
    const updated = {
      ...currentRoute,
      headers: {
        ...(currentRoute.headers || {}),
        [newHeaderKey.trim()]: newHeaderVal.trim(),
      },
    };
    handleUpdateRoute(updated);
    setNewHeaderKey('');
    setNewHeaderVal('');
  };

  const handleRemoveHeader = (keyToRemove: string) => {
    if (!currentRoute) return;
    const nextHeaders = { ...(currentRoute.headers || {}) };
    delete nextHeaders[keyToRemove];
    handleUpdateRoute({ ...currentRoute, headers: nextHeaders });
  };

  const handleCopyUrl = () => {
    if (!currentServer) return;
    navigator.clipboard.writeText(`http://localhost:${currentServer.port}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyLogPayload = (log: ServerLogEntry) => {
    const payload =
      typeof log.requestBody === 'object'
        ? JSON.stringify(log.requestBody, null, 2)
        : String(log.requestBody || '');
    navigator.clipboard.writeText(payload);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // State Store actions
  const fetchStoreData = async () => {
    const api = (window as any).interceptor?.mockServer;
    if (api?.getStore && currentServer) {
      const data = await api.getStore(currentServer.id);
      setStoreData(data || {});
      setStoreJsonInput(JSON.stringify(data || {}, null, 2));
    }
  };

  useEffect(() => {
    if (workbenchTab === 'store') {
      fetchStoreData();
    }
  }, [workbenchTab, currentServer]);

  const handleApplyStore = async () => {
    try {
      const parsed = JSON.parse(storeJsonInput);
      const api = (window as any).interceptor?.mockServer;
      if (api?.setStore && currentServer) {
        await api.setStore(currentServer.id, parsed);
        setStoreData(parsed);
        setIsEditingStore(false);
        setStoreFeedback('Store updated');
        setTimeout(() => setStoreFeedback(null), 2500);
      }
    } catch {
      alert('Invalid JSON in State Store editor.');
    }
  };

  const handleClearStore = async () => {
    const api = (window as any).interceptor?.mockServer;
    if (api?.clearStore && currentServer) {
      await api.clearStore(currentServer.id);
      setStoreData({});
      setStoreJsonInput('{}');
      setStoreFeedback('Store cleared');
      setTimeout(() => setStoreFeedback(null), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-[#cccccc] overflow-hidden">
      {/* Top Header */}
      <MockServerHeader
        servers={servers}
        currentServer={currentServer}
        selectedServerId={selectedServerId}
        onSelectServerId={(id) => {
          setSelectedServerId(id);
          onSelectServer?.(id);
        }}
        onNewServer={() => {
          const newServer: MockServer = {
            id: `server-${Date.now()}`,
            name: `Mock Server ${servers.length + 1}`,
            port: 3000 + servers.length + 1,
            status: 'stopped',
            routes: [
              {
                id: `route-${Date.now()}`,
                method: 'GET',
                path: '/api/v1/health',
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                responseBody: '{\n  "status": "healthy"\n}',
                responseMode: 'static',
                delayMs: 0,
              },
            ],
            corsEnabled: true,
            createdAt: Date.now(),
          };
          onUpdateServers([...servers, newServer]);
          setSelectedServerId(newServer.id);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleServer={handleToggleServer}
        isStartingServer={isStartingServer}
        workbenchTab={workbenchTab}
        onSelectWorkbenchTab={setWorkbenchTab}
        logsCount={logs.length}
        copiedUrl={copiedUrl}
        onCopyUrl={handleCopyUrl}
      />

      {/* Main Body */}
      {workbenchTab === 'editor' && (
        <div className="flex-1 flex overflow-hidden">
          <MockServerRouteList
            routes={filteredRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRouteId={setSelectedRouteId}
            onAddRoute={handleAddRoute}
            search={routeSearch}
            onSearchChange={setRouteSearch}
          />
          {currentRoute ? (
            <MockServerRouteEditor
              route={currentRoute}
              onUpdateRoute={handleUpdateRoute}
              onDeleteRoute={handleDeleteRoute}
              newHeaderKey={newHeaderKey}
              onNewHeaderKeyChange={setNewHeaderKey}
              newHeaderVal={newHeaderVal}
              onNewHeaderValChange={setNewHeaderVal}
              onAddHeader={handleAddHeader}
              onRemoveHeader={handleRemoveHeader}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#666666]">
              No route selected
            </div>
          )}
        </div>
      )}

      {workbenchTab === 'logs' && (
        <MockServerTrafficLogs
          logs={logs}
          onClearLogs={() => setLogs([])}
          logsSearch={logsSearch}
          onLogsSearchChange={setLogsSearch}
          logFilter={logFilter}
          onLogFilterChange={setLogFilter}
          expandedLogId={expandedLogId}
          onToggleExpandLog={(id) => setExpandedLogId(expandedLogId === id ? null : id)}
          onReplayInClient={onReplayInClient}
          copiedLogId={copiedLogId}
          onCopyLogPayload={handleCopyLogPayload}
        />
      )}

      {workbenchTab === 'store' && (
        <MockServerStateStore
          storeData={storeData}
          storeJsonInput={storeJsonInput}
          onStoreJsonInputChange={setStoreJsonInput}
          isEditingStore={isEditingStore}
          onSetIsEditingStore={setIsEditingStore}
          onRefreshStore={fetchStoreData}
          onApplyStore={handleApplyStore}
          onClearStore={handleClearStore}
          storeFeedback={storeFeedback}
        />
      )}

      {/* Settings Modal */}
      <MockServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        server={currentServer}
        onSave={(updatedServer) => {
          onUpdateServers(
            servers.map((s) => (s.id === updatedServer.id ? updatedServer : s))
          );
        }}
      />
    </div>
  );
};
