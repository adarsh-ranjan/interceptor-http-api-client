import React, { useState, useEffect, useCallback } from 'react';
import {
  HttpRequest,
  Collection,
  CollectionItem,
} from './types';
import { useEnvironments } from './hooks/useEnvironments';
import { useCollections } from './hooks/useCollections';
import { useHistory } from './hooks/useHistory';
import { useLayoutState } from './hooks/useLayoutState';
import { useMockServersState } from './hooks/useMockServersState';
import { useRequestTabs } from './hooks/useRequestTabs';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { RequestConfigurationPanel, ConfigSubTab } from './components/request/RequestConfigurationPanel';
import { Sidebar } from './components/Sidebar';
import { RequestTabs } from './components/RequestTabs';
import { RequestBar } from './components/RequestBar';
import { ResponseViewer } from './components/ResponseViewer';
import { WebSocketWorkbench } from './components/WebSocketWorkbench';
import { MockServerWorkbench } from './components/MockServerWorkbench';
import { SaveRequestModal } from './components/SaveRequestModal';
import { EnvironmentModal } from './components/EnvironmentModal';
import { CodeSnippetModal } from './components/CodeSnippetModal';
import { CollectionRunnerModal } from './components/CollectionRunnerModal';
import { Toast, ToastData } from './components/Toast';
import { DEFAULT_REQUEST } from './utils/defaults';

export const App: React.FC = () => {
  // Toast state
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = useCallback((toastData: Omit<ToastData, 'id'>) => {
    setToast({
      ...toastData,
      id: Math.random().toString(36).substring(2, 9),
    });
  }, []);

  // UI Navigation & Modals state
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>('params');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [collectionToRun, setCollectionToRun] = useState<Collection | null>(null);

  // Modular Hooks
  const {
    environments,
    activeEnvId,
    activeEnvironment,
    updateEnvironments,
    handleSetActiveEnv,
    handleSetEnvVarFromScript,
  } = useEnvironments();

  const { collections, updateCollections } = useCollections();
  const { history, addHistoryItem, handleClearHistory } = useHistory();

  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    workbenchLayout,
    setWorkbenchLayout,
    editorRatio,
    setEditorRatio,
    isDraggingSidebar,
    isDraggingEditor,
    isMaximized,
    workbenchContainerRef,
    handleStartSidebarResize,
    handleStartEditorResize,
    resetLayout,
  } = useLayoutState();

  const {
    mainView,
    setMainView,
    mockServers,
    setMockServers,
    activeMockServerId,
    setActiveMockServerId,
  } = useMockServersState();

  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    handleUrlChange,
    handleMethodChange,
    handleParamsChange,
    handleHeadersChange,
    handleAuthChange,
    handleBodyTypeChange,
    handleBodyContentChange,
    handlePrettifyBody,
    handleFormDataChange,
    handleUrlEncodedChange,
    handleBinaryFileChange,
    handleTestScriptChange,
    handleSendRequest,
    handleCancelRequest,
    handleNewTab,
    handleCloseTab,
    handleSelectFromSidebar,
    handleImportCurl,
    handleReplayInClient,
    handleWsConnect,
    handleWsDisconnect,
    handleWsSendMessage,
    handleWsClearMessages,
  } = useRequestTabs({
    activeEnvironment,
    environments,
    onSetEnvVarFromScript: handleSetEnvVarFromScript,
    onAddHistoryItem: addHistoryItem,
    onShowToast: showToast,
    onSelectSubTab: setConfigSubTab,
    mockServers,
    onSetMainView: setMainView,
  });

  // Save Request to Collection
  const handleSaveActiveRequest = () => {
    if (!activeTab || activeTab.protocol === 'websocket') return;

    if (activeTab.request.collectionId && activeTab.request.itemId) {
      const colId = activeTab.request.collectionId;
      const itemId = activeTab.request.itemId;

      const updateItemInTree = (items: CollectionItem[]): CollectionItem[] => {
        return items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              name: activeTab.request.name || item.name,
              request: { ...activeTab.request },
            };
          }
          if (item.children) {
            return { ...item, children: updateItemInTree(item.children) };
          }
          return item;
        });
      };

      const updatedCols = collections.map((c) => {
        if (c.id === colId) {
          return {
            ...c,
            items: updateItemInTree(c.items),
            updatedAt: Date.now(),
          };
        }
        return c;
      });

      updateCollections(updatedCols);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
      );
      return;
    }

    setIsSaveModalOpen(true);
  };

  const handleModalSave = (options: {
    name: string;
    collectionId: string;
    folderId?: string;
    newCollectionName?: string;
  }) => {
    const newItemId = `item-${Date.now()}`;
    let targetCollectionId = options.collectionId;
    let updatedCollections = [...collections];

    if (options.collectionId === 'new') {
      const newCol: Collection = {
        id: `col-${Date.now()}`,
        name: options.newCollectionName || 'New Collection',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      targetCollectionId = newCol.id;
      updatedCollections.push(newCol);
    }

    const savedRequest: HttpRequest = {
      ...activeTab.request,
      name: options.name,
      collectionId: targetCollectionId,
      itemId: newItemId,
    };

    const newCollectionItem: CollectionItem = {
      id: newItemId,
      name: options.name,
      type: 'request',
      request: savedRequest,
    };

    const addItemToFolder = (items: CollectionItem[]): CollectionItem[] => {
      return items.map((item) => {
        if (item.id === options.folderId && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), newCollectionItem],
          };
        }
        if (item.children) {
          return { ...item, children: addItemToFolder(item.children) };
        }
        return item;
      });
    };

    updatedCollections = updatedCollections.map((col) => {
      if (col.id === targetCollectionId) {
        if (options.folderId) {
          return {
            ...col,
            items: addItemToFolder(col.items),
            updatedAt: Date.now(),
          };
        } else {
          return {
            ...col,
            items: [...col.items, newCollectionItem],
            updatedAt: Date.now(),
          };
        }
      }
      return col;
    });

    updateCollections(updatedCollections);

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              title: `${savedRequest.method} ${savedRequest.name}`,
              request: savedRequest,
              isDirty: false,
            }
          : t
      )
    );
  };

  const handleNewRequestInCollection = (collectionId: string, folderId?: string) => {
    const newItemId = `item-${Date.now()}`;
    const newReq: HttpRequest = {
      ...DEFAULT_REQUEST,
      id: `req-${Date.now()}`,
      name: 'New Request',
      collectionId,
      itemId: newItemId,
    };

    const newCollectionItem: CollectionItem = {
      id: newItemId,
      name: 'New Request',
      type: 'request',
      request: newReq,
    };

    const addItem = (items: CollectionItem[]): CollectionItem[] => {
      if (folderId) {
        return items.map((item) => {
          if (item.id === folderId && item.type === 'folder') {
            return {
              ...item,
              children: [...(item.children || []), newCollectionItem],
            };
          }
          if (item.children) {
            return { ...item, children: addItem(item.children) };
          }
          return item;
        });
      }
      return [...items, newCollectionItem];
    };

    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        return {
          ...col,
          items: addItem(col.items),
          updatedAt: Date.now(),
        };
      }
      return col;
    });

    updateCollections(updated);
    handleNewTab('http', newReq);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (activeTab.protocol === 'http') {
          e.preventDefault();
          handleSendRequest();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveRequest();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewTab('http');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'w') {
        if (tabs.length > 1) {
          e.preventDefault();
          handleCloseTab(activeTabId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, activeTab, collections, activeEnvironment]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-card text-foreground">
      {/* Top Window Titlebar Header */}
      <AppHeader
        isMaximized={isMaximized}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        workbenchLayout={workbenchLayout}
        onSetWorkbenchLayout={setWorkbenchLayout}
        onResetLayout={resetLayout}
      />

      {/* Main Content Area (Sidebar + Workspace side-by-side) */}
      <div
        className={`flex-1 flex overflow-hidden ${
          isDraggingSidebar || isDraggingEditor ? 'select-none pointer-events-auto' : ''
        }`}
      >
        {/* Column 1: Sidebar with Collections & History */}
        <div
          className={`shrink-0 overflow-hidden ${
            isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'
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
                handleSelectFromSidebar(req, colId, itemId);
              }}
              onClearHistory={handleClearHistory}
              onUpdateCollections={updateCollections}
              onNewRequestInCollection={(colId, fId) => {
                setMainView('requests');
                handleNewRequestInCollection(colId, fId);
              }}
              onRunCollection={(col) => setCollectionToRun(col)}
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
            />
          </div>
        </div>

        {/* Resizer Handle: Sidebar vs Workspace */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={handleStartSidebarResize}
            className={`w-1 -ml-0.5 z-20 cursor-col-resize hover:bg-amber-500 active:bg-amber-500 border-r border-border transition-colors select-none ${
              isDraggingSidebar ? 'bg-amber-500' : ''
            }`}
            title="Drag to resize sidebar"
            onDoubleClick={() => setSidebarWidth(260)}
          />
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {mainView === 'mock-servers' ? (
            <MockServerWorkbench
              servers={mockServers}
              onUpdateServers={setMockServers}
              activeServerId={activeMockServerId}
              onSelectServer={setActiveMockServerId}
              onClose={() => setMainView('requests')}
              onReplayInClient={handleReplayInClient}
            />
          ) : (
            <>
              {/* Request Tabs (HTTP & WebSocket) */}
              <RequestTabs
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTab}
                onNewTab={(protocol) => handleNewTab(protocol || 'http')}
              />

              {/* Tab Content: HTTP Workbench or WebSocket Workbench */}
              {activeTab.protocol === 'websocket' ? (
                <WebSocketWorkbench
                  url={activeTab.wsUrl}
                  onUrlChange={(url) => {
                    setTabs((prev) =>
                      prev.map((t) => (t.id === activeTabId ? { ...t, wsUrl: url } : t))
                    );
                  }}
                  status={activeTab.wsStatus || 'disconnected'}
                  messages={activeTab.wsMessages || []}
                  onConnect={handleWsConnect}
                  onDisconnect={handleWsDisconnect}
                  onSendMessage={handleWsSendMessage}
                  onClearMessages={handleWsClearMessages}
                />
              ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Main Request Bar */}
                  <RequestBar
                    method={activeTab.request.method}
                    onMethodChange={handleMethodChange}
                    url={activeTab.request.url}
                    onUrlChange={handleUrlChange}
                    onSend={handleSendRequest}
                    onCancel={handleCancelRequest}
                    onSave={handleSaveActiveRequest}
                    onOpenCodeSnippet={() => setIsCodeModalOpen(true)}
                    onImportCurl={handleImportCurl}
                    activeEnvironment={activeEnvironment}
                    environments={environments}
                    onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                    isLoading={activeTab.isLoading}
                    isDirty={activeTab.isDirty}
                  />

                  {/* Workbench Body: Split View (Horizontal or Vertical) */}
                  <div
                    ref={workbenchContainerRef}
                    className={`flex-1 flex overflow-hidden ${
                      workbenchLayout === 'horizontal' ? 'flex-row' : 'flex-col'
                    }`}
                  >
                    {/* Request Configuration Panel */}
                    <div
                      style={
                        workbenchLayout === 'horizontal'
                          ? { width: `${editorRatio * 100}%` }
                          : { height: `${editorRatio * 100}%` }
                      }
                      className="flex flex-col overflow-hidden bg-card shrink-0 min-w-[200px] min-h-[100px]"
                    >
                      <RequestConfigurationPanel
                        tab={activeTab}
                        configSubTab={configSubTab}
                        onChangeSubTab={setConfigSubTab}
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                        onParamsChange={handleParamsChange}
                        onHeadersChange={handleHeadersChange}
                        onAuthChange={handleAuthChange}
                        onBodyTypeChange={handleBodyTypeChange}
                        onBodyContentChange={handleBodyContentChange}
                        onFormDataChange={handleFormDataChange}
                        onUrlEncodedChange={handleUrlEncodedChange}
                        onBinaryFileChange={handleBinaryFileChange}
                        onTestScriptChange={handleTestScriptChange}
                        onPrettifyBody={handlePrettifyBody}
                        onShowToast={showToast}
                      />
                    </div>

                    {/* Splitter: Resizer Handle */}
                    <div
                      onMouseDown={handleStartEditorResize}
                      className={`z-20 select-none group flex items-center justify-center shrink-0 ${
                        workbenchLayout === 'horizontal'
                          ? 'w-1.5 -ml-1 cursor-col-resize hover:bg-amber-500 active:bg-amber-500 border-r border-border'
                          : 'h-1.5 -mt-1 cursor-row-resize hover:bg-amber-500 active:bg-amber-500 border-b border-border'
                      } ${isDraggingEditor ? 'bg-amber-500' : ''}`}
                      title={`Drag to resize ${workbenchLayout === 'horizontal' ? 'columns' : 'rows'}`}
                      onDoubleClick={() => setEditorRatio(0.5)}
                    >
                      <div
                        className={`rounded-full bg-muted-foreground/40 group-hover:bg-amber-500 transition-colors ${
                          workbenchLayout === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
                        }`}
                      />
                    </div>

                    {/* Response Viewer Panel */}
                    <div
                      style={
                        workbenchLayout === 'horizontal'
                          ? { width: `${(1 - editorRatio) * 100}%` }
                          : { height: `${(1 - editorRatio) * 100}%` }
                      }
                      className="flex flex-col overflow-hidden bg-card shrink-0 min-w-[250px] min-h-[100px]"
                    >
                      <ResponseViewer
                        response={activeTab.response}
                        isLoading={activeTab.isLoading}
                        activeUrl={activeTab.request.url}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Request Modal */}
      <SaveRequestModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        request={activeTab.request}
        collections={collections}
        onSave={handleModalSave}
      />

      {/* Environment Management Modal */}
      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        environments={environments}
        onUpdateEnvironments={updateEnvironments}
        activeEnvId={activeEnvId}
        onSetActiveEnvId={handleSetActiveEnv}
      />

      {/* Code Snippet Modal */}
      <CodeSnippetModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        request={activeTab.request}
      />

      {/* Collection Runner Modal */}
      <CollectionRunnerModal
        isOpen={!!collectionToRun}
        onClose={() => setCollectionToRun(null)}
        collection={collectionToRun}
        environments={environments}
        activeEnvId={activeEnvId}
      />

      {/* Bottom Status Bar */}
      <AppFooter
        onOpenEnvModal={() => setIsEnvModalOpen(true)}
        onShowToast={showToast}
      />

      {/* Toast Notification Container */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default App;
