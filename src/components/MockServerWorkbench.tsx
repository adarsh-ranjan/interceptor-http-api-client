import React from 'react';
import { MockServer, ServerLogEntry } from '../types/server';
import { useMockServerWorkbench } from '../hooks/useMockServerWorkbench';
import { AlertCircle, Clock, Code2, Database } from 'lucide-react';
import { MockServerHeader } from './mockServer/MockServerHeader';
import { MockRoutesSidebar } from './mockServer/MockRoutesSidebar';
import { MockRouteEditor } from './mockServer/MockRouteEditor';
import { MockTrafficLogs } from './mockServer/MockTrafficLogs';
import { MockStateStorePanel } from './mockServer/MockStateStorePanel';

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
  onReplayInClient,
}) => {
  const {
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
  } = useMockServerWorkbench({
    servers,
    onUpdateServers,
    activeServerId,
    onSelectServer,
  });

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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-[#cccccc] font-sans select-none overflow-hidden">
      <MockServerHeader
        servers={servers}
        currentServer={currentServer}
        isStartingServer={isStartingServer}
        onSelectServer={handleSelectServer}
        onCreateServer={handleCreateServer}
        onUpdateServer={handleUpdateServer}
        onStartServer={handleStartServer}
        onStopServer={handleStopServer}
        onDeleteServer={handleDeleteServer}
      />

      <div className="flex-1 flex overflow-hidden">
        <MockRoutesSidebar
          routes={filteredRoutes}
          selectedRouteId={selectedRouteId}
          routeSearch={routeSearch}
          onRouteSearchChange={setRouteSearch}
          onSelectRoute={(routeId) => {
            setSelectedRouteId(routeId);
            setWorkbenchTab('editor');
          }}
          onCreateRoute={handleCreateRoute}
          onToggleRoute={handleToggleRoute}
          onDeleteRoute={handleDeleteRoute}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
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
                  <sup className="font-semibold text-[10px] text-[#d99b26] ml-0.5">
                    {filteredLogs.length}
                  </sup>
                )}
              </button>

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

          {workbenchTab === 'editor' && currentRoute && (
            <MockRouteEditor
              route={currentRoute}
              onUpdateRoute={handleUpdateCurrentRoute}
              onPrettifyBody={handlePrettifyBody}
            />
          )}

          {workbenchTab === 'logs' && (
            <MockTrafficLogs
              port={currentServer.port}
              logs={filteredLogs}
              logsSearch={logsSearch}
              logFilter={logFilter}
              expandedLogId={expandedLogId}
              copiedLogId={copiedLogId}
              onLogsSearchChange={setLogsSearch}
              onLogFilterChange={setLogFilter}
              onClearLogs={clearLogs}
              onToggleExpandLog={(id) => setExpandedLogId(expandedLogId === id ? null : id)}
              onCopyCurl={handleCopyCurl}
              onReplayInClient={onReplayInClient}
            />
          )}

          {workbenchTab === 'store' && (
            <MockStateStorePanel
              storeData={storeData}
              storeJsonInput={storeJsonInput}
              isEditingStore={isEditingStore}
              storeFeedback={storeFeedback}
              onStoreJsonInputChange={setStoreJsonInput}
              onRefreshStore={fetchServerStore}
              onToggleEditStore={() => {
                setIsEditingStore(!isEditingStore);
                setStoreJsonInput(JSON.stringify(storeData, null, 2));
              }}
              onSaveStore={handleSaveServerStore}
              onClearStore={handleClearServerStore}
            />
          )}
        </div>
      </div>
    </div>
  );
};
