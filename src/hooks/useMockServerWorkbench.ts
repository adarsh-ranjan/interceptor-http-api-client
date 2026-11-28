import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mockServerClient } from '../services/mockServerClient';
import { MockRoute, MockServer, ServerLogEntry } from '../types/server';
import { buildCurlFromServerLog } from '../utils/mockServerMapping';
import { useKeyedClipboard } from './useClipboard';

interface UseMockServerWorkbenchOptions {
  servers: MockServer[];
  onUpdateServers: (servers: MockServer[]) => void;
  activeServerId?: string;
  onSelectServer?: (serverId: string) => void;
}

export type MockWorkbenchTab = 'editor' | 'logs' | 'store';
export type LogFilterMode = 'all' | '2xx' | '4xx' | '5xx' | 'proxied';

export function useMockServerWorkbench({
  servers,
  onUpdateServers,
  activeServerId,
  onSelectServer,
}: UseMockServerWorkbenchOptions) {
  const [selectedServerId, setSelectedServerId] = useState<string>(
    activeServerId || servers[0]?.id || ''
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [workbenchTab, setWorkbenchTab] = useState<MockWorkbenchTab>('editor');
  const [routeSearch, setRouteSearch] = useState<string>('');
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isStartingServer, setIsStartingServer] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<LogFilterMode>('all');

  const [storeData, setStoreData] = useState<Record<string, any>>({});
  const [storeJsonInput, setStoreJsonInput] = useState<string>('{}');
  const [isEditingStore, setIsEditingStore] = useState<boolean>(false);
  const [storeFeedback, setStoreFeedback] = useState<string | null>(null);

  const { copiedKey: copiedLogId, copy: copyLogCurl } = useKeyedClipboard(2000);

  // Keep latest servers/onUpdateServers in refs so IPC listeners stay stable
  const serversRef = useRef(servers);
  serversRef.current = servers;
  const onUpdateServersRef = useRef(onUpdateServers);
  onUpdateServersRef.current = onUpdateServers;

  const currentServer = useMemo(
    () => servers.find((s) => s.id === selectedServerId) || servers[0],
    [servers, selectedServerId]
  );

  useEffect(() => {
    if (activeServerId && activeServerId !== selectedServerId) {
      setSelectedServerId(activeServerId);
    }
  }, [activeServerId, selectedServerId]);

  useEffect(() => {
    if (
      currentServer &&
      (!selectedRouteId || !currentServer.routes.find((r) => r.id === selectedRouteId))
    ) {
      setSelectedRouteId(currentServer.routes[0]?.id || '');
    }
  }, [currentServer, selectedRouteId]);

  useEffect(() => {
    const unbindLog = mockServerClient.subscribeToLogs((log) => {
      setLogs((prev) => [log, ...prev].slice(0, 500));
      onUpdateServersRef.current(
        serversRef.current.map((s) => {
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

    const unbindStatus = mockServerClient.subscribeToStatusChanges((data) => {
      setIsStartingServer(false);
      onUpdateServersRef.current(
        serversRef.current.map((s) => {
          if (s.id !== data.serverId) return s;
          return {
            ...s,
            status: data.status,
            errorMessage: data.error,
          };
        })
      );
    });

    return () => {
      unbindLog();
      unbindStatus();
    };
  }, []);

  const currentRoute = useMemo(
    () => currentServer?.routes.find((r) => r.id === selectedRouteId),
    [currentServer, selectedRouteId]
  );

  const filteredRoutes = useMemo(() => {
    if (!currentServer) return [];
    if (!routeSearch.trim()) return currentServer.routes;
    const q = routeSearch.toLowerCase();
    return currentServer.routes.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q)
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
    return serverLogs.filter(
      (l) => l.path.toLowerCase().includes(q) || l.method.toLowerCase().includes(q)
    );
  }, [logs, currentServer, logsSearch, logFilter]);

  const handleSelectServer = useCallback(
    (id: string) => {
      setSelectedServerId(id);
      onSelectServer?.(id);
    },
    [onSelectServer]
  );

  const handleUpdateServer = useCallback(
    (updated: Partial<MockServer>) => {
      if (!currentServer) return;
      onUpdateServers(
        servers.map((s) => (s.id === currentServer.id ? { ...s, ...updated } : s))
      );
    },
    [currentServer, onUpdateServers, servers]
  );

  const handleStartServer = useCallback(async () => {
    if (!currentServer) return;
    setIsStartingServer(true);
    const res = await mockServerClient.startServer(currentServer);
    setIsStartingServer(false);
    if (!res.success) {
      handleUpdateServer({ status: 'error', errorMessage: res.error });
    } else {
      handleUpdateServer({ status: 'running', errorMessage: undefined });
    }
  }, [currentServer, handleUpdateServer]);

  const handleStopServer = useCallback(async () => {
    if (!currentServer) return;
    await mockServerClient.stopServer(currentServer.id);
    handleUpdateServer({ status: 'stopped', errorMessage: undefined });
  }, [currentServer, handleUpdateServer]);

  const handleCreateServer = useCallback(() => {
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
  }, [servers, onUpdateServers, onSelectServer]);

  const handleDeleteServer = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (servers.length <= 1) return;
      handleStopServer();
      const next = servers.filter((s) => s.id !== id);
      onUpdateServers(next);
      if (selectedServerId === id) {
        setSelectedServerId(next[0].id);
        onSelectServer?.(next[0].id);
      }
    },
    [servers, handleStopServer, onUpdateServers, selectedServerId, onSelectServer]
  );

  const handleCreateRoute = useCallback(() => {
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
        headers: [
          { id: `h-${Date.now()}`, key: 'Content-Type', value: 'application/json', enabled: true },
        ],
        body: JSON.stringify({ status: 'ok', data: [] }, null, 2),
      },
      dynamicScript: `// Dynamic route handler\nres.status(200).json({\n  timestamp: new Date().toISOString(),\n  query: req.query\n});`,
      hitCount: 0,
    };

    handleUpdateServer({ routes: [...currentServer.routes, newRoute] });
    setSelectedRouteId(newRoute.id);
  }, [currentServer, handleUpdateServer]);

  const handleUpdateCurrentRoute = useCallback(
    (updated: Partial<MockRoute>) => {
      if (!currentServer || !currentRoute) return;
      const updatedRoutes = currentServer.routes.map((r) =>
        r.id === currentRoute.id ? { ...r, ...updated } : r
      );
      handleUpdateServer({ routes: updatedRoutes });
    },
    [currentServer, currentRoute, handleUpdateServer]
  );

  const handleDeleteRoute = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentServer) return;
      const updatedRoutes = currentServer.routes.filter((r) => r.id !== id);
      handleUpdateServer({ routes: updatedRoutes });
      if (selectedRouteId === id && updatedRoutes.length > 0) {
        setSelectedRouteId(updatedRoutes[0].id);
      }
    },
    [currentServer, handleUpdateServer, selectedRouteId]
  );

  const handleToggleRoute = useCallback(
    (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (!currentServer) return;
      const updatedRoutes = currentServer.routes.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      );
      handleUpdateServer({ routes: updatedRoutes });
    },
    [currentServer, handleUpdateServer]
  );

  const handlePrettifyBody = useCallback(() => {
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
      // Invalid JSON; ignore
    }
  }, [currentRoute, handleUpdateCurrentRoute]);

  const fetchServerStore = useCallback(async () => {
    if (!currentServer) return;
    try {
      const data = await mockServerClient.getStore(currentServer.id);
      if (data !== null) {
        setStoreData(data);
        setStoreJsonInput(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Failed to get store', err);
    }
  }, [currentServer]);

  const handleClearServerStore = useCallback(async () => {
    if (!currentServer) return;
    const ok = await mockServerClient.clearStore(currentServer.id);
    if (ok) {
      setStoreData({});
      setStoreJsonInput('{}');
      setStoreFeedback('Store cleared');
      setTimeout(() => setStoreFeedback(null), 2000);
    }
  }, [currentServer]);

  const handleSaveServerStore = useCallback(async () => {
    if (!currentServer) return;
    try {
      const parsed = JSON.parse(storeJsonInput);
      const ok = await mockServerClient.setStore(currentServer.id, parsed);
      if (ok) {
        setStoreData(parsed);
        setIsEditingStore(false);
        setStoreFeedback('Store updated successfully');
        setTimeout(() => setStoreFeedback(null), 2000);
      }
    } catch (err: any) {
      setStoreFeedback(`Invalid JSON: ${err.message}`);
    }
  }, [currentServer, storeJsonInput]);

  const handleCopyCurl = useCallback(
    (log: ServerLogEntry) => {
      if (!currentServer) return;
      const cmd = buildCurlFromServerLog(log, currentServer.port);
      copyLogCurl(log.id, cmd);
    },
    [currentServer, copyLogCurl]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    currentServer,
    currentRoute,
    selectedRouteId,
    setSelectedRouteId,
    workbenchTab,
    setWorkbenchTab,
    routeSearch,
    setRouteSearch,
    logsSearch,
    setLogsSearch,
    filteredRoutes,
    filteredLogs,
    expandedLogId,
    setExpandedLogId,
    copiedLogId,
    isStartingServer,
    logFilter,
    setLogFilter,
    storeData,
    storeJsonInput,
    setStoreJsonInput,
    isEditingStore,
    setIsEditingStore,
    storeFeedback,
    handleSelectServer,
    handleUpdateServer,
    handleStartServer,
    handleStopServer,
    handleCreateServer,
    handleDeleteServer,
    handleCreateRoute,
    handleUpdateCurrentRoute,
    handleDeleteRoute,
    handleToggleRoute,
    handlePrettifyBody,
    fetchServerStore,
    handleClearServerStore,
    handleSaveServerStore,
    handleCopyCurl,
    clearLogs,
  };
}
