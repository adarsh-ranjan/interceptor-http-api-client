import React, { useCallback, useState } from 'react';
import { DEFAULT_SIDEBAR_WIDTH } from './constants/defaults';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useCollections } from './hooks/useCollections';
import { useEnvironments } from './hooks/useEnvironments';
import { useHistory } from './hooks/useHistory';
import { useLayoutPreferences } from './hooks/useLayoutPreferences';
import { useMockServers } from './hooks/useMockServers';
import { useRequestTabs } from './hooks/useRequestTabs';
import { useToast } from './hooks/useToast';
import { useWindowMaximized } from './hooks/useWindowMaximized';
import { Collection } from './types';
import { findCollectionForRequest } from './utils/collectionTree';
import { CodeSnippetModal } from './components/CodeSnippetModal';
import { CollectionRunnerModal } from './components/CollectionRunnerModal';
import { EnvironmentModal } from './components/EnvironmentModal';
import { CollectionHeader } from './components/layout/CollectionHeader';
import { RequestWorkbench } from './components/layout/RequestWorkbench';
import { StatusBar } from './components/layout/StatusBar';
import { TitleBar } from './components/layout/TitleBar';
import { MockServerWorkbench } from './components/MockServerWorkbench';
import { RequestTabs } from './components/RequestTabs';
import { SaveRequestModal } from './components/SaveRequestModal';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { WebSocketWorkbench } from './components/WebSocketWorkbench';

export const App: React.FC = () => {
  const [mainView, setMainView] = useState<'requests' | 'mock-servers'>('requests');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [collectionToRun, setCollectionToRun] = useState<Collection | null>(null);

  const isMaximized = useWindowMaximized();
  const { toast, showToast, dismissToast } = useToast();

  const {
    isSidebarCollapsed,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    workbenchLayout,
    setWorkbenchLayout,
    editorRatio,
    setEditorRatio,
    isDraggingSidebar,
    isDraggingEditor,
    workbenchContainerRef,
    handleStartSidebarResize,
    handleStartEditorResize,
    resetLayout,
  } = useLayoutPreferences();

  const {
    environments,
    activeEnvId,
    activeEnvironment,
    updateEnvironments,
    selectActiveEnv,
    setEnvVarFromScript,
  } = useEnvironments();

  const {
    collections,
    updateCollections,
    saveExistingRequest,
    saveNewRequest,
    createRequestInCollection,
  } = useCollections();

  const { history, addHistoryEntry, clearHistory } = useHistory();

  const {
    mockServers,
    setMockServers,
    activeMockServerId,
    setActiveMockServerId,
    runningMockServerCount,
    getServerPort,
  } = useMockServers();

  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    configSubTab,
    setConfigSubTab,
    markActiveTabSaved,
    clearActiveTabDirty,
    handleUrlChange,
    handleParamsChange,
    handleHeadersChange,
    handleAuthChange,
    handleMethodChange,
    handleBodyTypeChange,
    handleBodyContentChange,
    handlePrettifyBody,
    handleFormDataChange,
    handleUrlEncodedChange,
    handleBinaryFileChange,
    handleTestScriptChange,
    handleImportCurl,
    handleSendRequest,
    handleCancelRequest,
    handleNewTab,
    handleCloseTab,
    handleSelectRequest,
    handleReplayMockLog,
    handleWsUrlChange,
    handleWsConnect,
    handleWsDisconnect,
    handleWsSendMessage,
    handleWsClearMessages,
  } = useRequestTabs({
    activeEnvironment,
    environments,
    onSetEnvVarFromScript: setEnvVarFromScript,
    onAddHistoryEntry: addHistoryEntry,
    showToast,
  });

  const handleSaveActiveRequest = useCallback(() => {
    if (!activeTab || activeTab.protocol === 'websocket') return;
    if (saveExistingRequest(activeTab.request)) {
      clearActiveTabDirty();
      return;
    }
    setIsSaveModalOpen(true);
  }, [activeTab, saveExistingRequest, clearActiveTabDirty]);

  const handleModalSave = useCallback(
    (options: {
      name: string;
      collectionId: string;
      folderId?: string;
      newCollectionName?: string;
    }) => {
      const savedRequest = saveNewRequest(activeTab.request, options);
      markActiveTabSaved(savedRequest);
    },
    [activeTab.request, saveNewRequest, markActiveTabSaved]
  );

  const handleNewRequestInCollection = useCallback(
    (collectionId: string, folderId?: string) => {
      const newReq = createRequestInCollection(collectionId, folderId);
      handleNewTab('http', newReq);
    },
    [createRequestInCollection, handleNewTab]
  );

  useAppShortcuts({
    activeProtocol: activeTab.protocol,
    tabsCount: tabs.length,
    onSend: handleSendRequest,
    onSave: handleSaveActiveRequest,
    onNewTab: () => handleNewTab('http'),
    onCloseActiveTab: () => handleCloseTab(activeTabId),
    onToggleSidebar: toggleSidebar,
  });

  const activeCollection = findCollectionForRequest(
    collections,
    activeTab.request.id,
    activeTab.request.itemId
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a] text-[#cccccc]">
      <TitleBar
        isMaximized={isMaximized}
        isSidebarCollapsed={isSidebarCollapsed}
        workbenchLayout={workbenchLayout}
        onToggleSidebar={toggleSidebar}
        onSetWorkbenchLayout={setWorkbenchLayout}
        onResetLayout={resetLayout}
      />

      <div
        className={`flex-1 flex overflow-hidden border-t border-[#333333] ${isDraggingSidebar || isDraggingEditor ? 'select-none pointer-events-auto' : ''
          }`}
      >
        <div
          className={`shrink-0 overflow-hidden ${isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'
            }`}
          style={{
            width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
            opacity: isSidebarCollapsed ? 0 : 1,
            pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
          }}
        >
          <div style={{ width: `${sidebarWidth}px` }} className="h-full">
            <Sidebar
              history={history}
              collections={collections}
              onSelectRequest={(req, colId, itemId) => {
                setMainView('requests');
                handleSelectRequest(req, colId, itemId);
              }}
              onClearHistory={clearHistory}
              onUpdateCollections={updateCollections}
              onNewRequestInCollection={(colId, fId) => {
                setMainView('requests');
                handleNewRequestInCollection(colId, fId);
              }}
              onRunCollection={setCollectionToRun}
              environments={environments}
              activeEnvId={activeEnvId}
              activeItemId={
                activeTab.protocol === 'http'
                  ? activeTab.request.itemId || activeTab.request.id
                  : undefined
              }
              width={sidebarWidth}
              onOpenMockServers={() => setMainView('mock-servers')}
              activeSection={mainView}
              runningMockServerCount={runningMockServerCount}
            />
          </div>
        </div>

        <div
          onMouseDown={!isSidebarCollapsed ? handleStartSidebarResize : undefined}
          className={`z-20 select-none group flex items-center justify-center shrink-0 border-r border-[#333333] ${isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'
            } ${isSidebarCollapsed
              ? 'w-0 opacity-0 pointer-events-none border-transparent'
              : 'w-1.5 -ml-1 cursor-col-resize hover:bg-[#d99b26] active:bg-[#d99b26]'
            } ${isDraggingSidebar ? 'bg-[#d99b26]' : ''}`}
          title="Drag to resize sidebar (Double click to reset to 260px)"
          onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
        >
          {!isSidebarCollapsed && (
            <div className="w-0.5 h-6 rounded-full bg-[#444444] group-hover:bg-[#d99b26] transition-colors" />
          )}
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#1a1a1a]">
          <CollectionHeader
            mainView={mainView}
            onChangeMainView={setMainView}
            runningMockServerCount={runningMockServerCount}
            activeCollectionName={activeCollection?.name}
            environments={environments}
            activeEnvId={activeEnvId}
            onSelectEnv={selectActiveEnv}
            onOpenEnvModal={() => setIsEnvModalOpen(true)}
            showToast={showToast}
          />

          {mainView === 'mock-servers' ? (
            <MockServerWorkbench
              servers={mockServers}
              onUpdateServers={setMockServers}
              activeServerId={activeMockServerId}
              onSelectServer={setActiveMockServerId}
              onClose={() => setMainView('requests')}
              onReplayInClient={(log) => {
                handleReplayMockLog(log, getServerPort(log.serverId));
                setMainView('requests');
              }}
            />
          ) : (
            <>
              <RequestTabs
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTab}
                onNewTab={(protocol) => handleNewTab(protocol || 'http')}
              />

              {activeTab.protocol === 'websocket' ? (
                <WebSocketWorkbench
                  url={activeTab.wsUrl}
                  onUrlChange={handleWsUrlChange}
                  status={activeTab.wsStatus || 'disconnected'}
                  messages={activeTab.wsMessages || []}
                  onConnect={handleWsConnect}
                  onDisconnect={handleWsDisconnect}
                  onSendMessage={handleWsSendMessage}
                  onClearMessages={handleWsClearMessages}
                />
              ) : (
                <RequestWorkbench
                  activeTab={activeTab}
                  activeEnvironment={activeEnvironment}
                  environments={environments}
                  configSubTab={configSubTab}
                  workbenchLayout={workbenchLayout}
                  editorRatio={editorRatio}
                  isDraggingEditor={isDraggingEditor}
                  workbenchContainerRef={workbenchContainerRef}
                  onSelectConfigSubTab={setConfigSubTab}
                  onStartEditorResize={handleStartEditorResize}
                  onResetEditorRatio={() => setEditorRatio(0.5)}
                  onMethodChange={handleMethodChange}
                  onUrlChange={handleUrlChange}
                  onSend={handleSendRequest}
                  onCancel={handleCancelRequest}
                  onSave={handleSaveActiveRequest}
                  onOpenCodeSnippet={() => setIsCodeModalOpen(true)}
                  onImportCurl={handleImportCurl}
                  onOpenEnvModal={() => setIsEnvModalOpen(true)}
                  onParamsChange={handleParamsChange}
                  onHeadersChange={handleHeadersChange}
                  onAuthChange={handleAuthChange}
                  onBodyTypeChange={handleBodyTypeChange}
                  onBodyContentChange={handleBodyContentChange}
                  onPrettifyBody={handlePrettifyBody}
                  onFormDataChange={handleFormDataChange}
                  onUrlEncodedChange={handleUrlEncodedChange}
                  onBinaryFileChange={handleBinaryFileChange}
                  onTestScriptChange={handleTestScriptChange}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </div>
      </div>

      <SaveRequestModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        request={activeTab.request}
        collections={collections}
        onSave={handleModalSave}
      />

      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        environments={environments}
        onUpdateEnvironments={updateEnvironments}
        activeEnvId={activeEnvId}
        onSetActiveEnvId={selectActiveEnv}
      />

      <CodeSnippetModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        request={activeTab.request}
      />

      <CollectionRunnerModal
        isOpen={!!collectionToRun}
        onClose={() => setCollectionToRun(null)}
        collection={collectionToRun}
        environments={environments}
        activeEnvId={activeEnvId}
      />

      <StatusBar onOpenEnvModal={() => setIsEnvModalOpen(true)} showToast={showToast} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
