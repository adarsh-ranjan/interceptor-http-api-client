import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HttpRequest,
  HttpResponse,
  TabItem,
  HistoryItem,
  Collection,
  CollectionItem,
  Environment,
  HttpMethod,
  KeyValuePair,
  BodyType,
  AuthConfig,
  FormDataItem,
  RequestProtocol,
  WebSocketMessage,
  WebSocketStatus,
} from './types';
import {
  syncUrlWithParams,
  extractParamsFromUrl,
  keyValuesToRecord,
} from './utils/http';
import { interpolateRequest } from './utils/variables';
import { applyAuthToHeadersAndParams, getAuthSummary } from './utils/auth';
import { runTestScript } from './utils/testRunner';
import { RequestBar } from './components/RequestBar';
import { KeyValueEditor } from './components/KeyValueEditor';
import { BodyEditor } from './components/BodyEditor';
import { AuthEditor } from './components/AuthEditor';
import { TestScriptEditor } from './components/TestScriptEditor';
import { ResponseViewer } from './components/ResponseViewer';
import { Sidebar } from './components/Sidebar';
import { RequestTabs } from './components/RequestTabs';
import { SaveRequestModal } from './components/SaveRequestModal';
import { EnvironmentSelector } from './components/EnvironmentSelector';
import { EnvironmentModal } from './components/EnvironmentModal';
import { CodeSnippetModal } from './components/CodeSnippetModal';
import { CollectionRunnerModal } from './components/CollectionRunnerModal';
import { WebSocketWorkbench } from './components/WebSocketWorkbench';
import { Shield, CheckSquare, Radio } from 'lucide-react';

const DEFAULT_REQUEST: HttpRequest = {
  id: 'req-initial',
  name: 'New Request',
  method: 'GET',
  url: '{{baseUrl}}/posts/1',
  params: [],
  headers: [
    {
      id: 'h-1',
      key: 'Accept',
      value: 'application/json',
      enabled: true,
      description: 'Accepted response content-type',
    },
  ],
  auth: { type: 'none' },
  bodyType: 'none',
  bodyContent: '',
  formData: [],
  urlEncoded: [],
  testScript: `// Automatic assertions run upon response\ninterceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("Response is JSON", () => {\n  interceptor.expect(res.isJson).toBe(true);\n});\n`,
};

const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'env-dev',
    name: 'Development',
    variables: [
      {
        id: 'var-1',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-2',
        key: 'apiKey',
        value: 'dev_token_secret_9981',
        enabled: true,
      },
    ],
  },
  {
    id: 'env-prod',
    name: 'Production',
    variables: [
      {
        id: 'var-3',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-4',
        key: 'apiKey',
        value: 'prod_token_live_4412',
        enabled: true,
      },
    ],
  },
];

const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-sample-1',
    name: 'JSONPlaceholder API',
    description: 'Sample REST API collection with tests & variables',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items: [
      {
        id: 'item-1',
        name: 'Get All Posts (with Tests)',
        type: 'request',
        request: {
          id: 'req-sample-1',
          name: 'Get All Posts (with Tests)',
          method: 'GET',
          url: '{{baseUrl}}/posts?_limit=10',
          params: [{ id: 'p1', key: '_limit', value: '10', enabled: true }],
          headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
          auth: { type: 'none' },
          bodyType: 'none',
          bodyContent: '',
          testScript: `interceptor.test("Status is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("Received 10 posts", () => {\n  interceptor.expect(res.data.length).toBe(10);\n});\n`,
        },
      },
      {
        id: 'item-2',
        name: 'Get Post by ID',
        type: 'request',
        request: {
          id: 'req-sample-2',
          name: 'Get Post by ID',
          method: 'GET',
          url: '{{baseUrl}}/posts/1',
          params: [],
          headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
          auth: { type: 'none' },
          bodyType: 'none',
          bodyContent: '',
          testScript: `interceptor.test("Status is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});\n\ninterceptor.test("ID is 1", () => {\n  interceptor.expect(res.data.id).toBe(1);\n});\n`,
        },
      },
      {
        id: 'folder-1',
        name: 'Authenticated Requests',
        type: 'folder',
        children: [
          {
            id: 'item-3',
            name: 'Create Post with Bearer Auth',
            type: 'request',
            request: {
              id: 'req-sample-3',
              name: 'Create Post with Bearer Auth',
              method: 'POST',
              url: '{{baseUrl}}/posts',
              params: [],
              headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
              auth: {
                type: 'bearer',
                bearerToken: '{{apiKey}}',
              },
              bodyType: 'json',
              bodyContent: JSON.stringify(
                {
                  title: 'Secure Upload',
                  body: 'Payload authenticated via Bearer token',
                  userId: 1,
                },
                null,
                2
              ),
              testScript: `interceptor.test("Post created", () => {\n  interceptor.expect(res.status).toBe(201);\n});\n`,
            },
          },
        ],
      },
    ],
  },
];

export const App: React.FC = () => {
  // Tabs State
  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: 'tab-1',
      title: 'GET posts/1',
      protocol: 'http',
      request: { ...DEFAULT_REQUEST },
      response: null,
      isLoading: false,
      isDirty: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // WebSocket Live Connections Reference Map
  const wsConnectionsRef = useRef<Map<string, WebSocket>>(new Map());

  // Sidebar & Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [configSubTab, setConfigSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'tests'>('params');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [collectionToRun, setCollectionToRun] = useState<Collection | null>(null);

  // Environments State with Persistence
  const [environments, setEnvironments] = useState<Environment[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_environments');
      return saved ? JSON.parse(saved) : INITIAL_ENVIRONMENTS;
    } catch {
      return INITIAL_ENVIRONMENTS;
    }
  });

  const [activeEnvId, setActiveEnvId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('interceptor_active_env_id') || 'env-dev';
    } catch {
      return 'env-dev';
    }
  });

  const updateEnvironments = (newEnvs: Environment[]) => {
    setEnvironments(newEnvs);
    try {
      localStorage.setItem('interceptor_environments', JSON.stringify(newEnvs));
    } catch {
      // ignore
    }
  };

  const handleSetActiveEnv = (id: string | null) => {
    setActiveEnvId(id);
    try {
      if (id) {
        localStorage.setItem('interceptor_active_env_id', id);
      } else {
        localStorage.removeItem('interceptor_active_env_id');
      }
    } catch {
      // ignore
    }
  };

  const handleSetEnvVarFromScript = (key: string, value: string) => {
    if (!activeEnvId) return;
    setEnvironments((prevEnvs) => {
      const updated = prevEnvs.map((env) => {
        if (env.id === activeEnvId) {
          const varIndex = env.variables.findIndex((v) => v.key === key);
          let newVars = [...env.variables];
          if (varIndex >= 0) {
            newVars[varIndex] = { ...newVars[varIndex], value, enabled: true };
          } else {
            newVars.push({
              id: `var-${Date.now()}`,
              key,
              value,
              enabled: true,
            });
          }
          return { ...env, variables: newVars };
        }
        return env;
      });
      try {
        localStorage.setItem('interceptor_environments', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Collections State with Persistence
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_collections');
      return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
    } catch {
      return INITIAL_COLLECTIONS;
    }
  });

  const updateCollections = (newCols: Collection[]) => {
    setCollections(newCols);
    try {
      localStorage.setItem('interceptor_collections', JSON.stringify(newCols));
    } catch {
      // ignore
    }
  };

  // Persistent History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeEnvironment = environments.find((e) => e.id === activeEnvId);

  const updateActiveRequest = useCallback(
    (updater: (prevReq: HttpRequest) => HttpRequest) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id === activeTabId) {
            const updatedReq = updater(tab.request);
            let updatedTitle = updatedReq.name && updatedReq.name !== 'New Request'
              ? updatedReq.name
              : updatedReq.url
              ? updatedReq.url.replace(/^https?:\/\//, '').split('?')[0].slice(-24)
              : 'New Request';
            return {
              ...tab,
              title: `${updatedReq.method} ${updatedTitle}`,
              request: updatedReq,
              isDirty: true,
            };
          }
          return tab;
        })
      );
    },
    [activeTabId]
  );

  // Synchronize URL and Params
  const handleUrlChange = (newUrl: string) => {
    updateActiveRequest((prev) => {
      const updatedParams = extractParamsFromUrl(newUrl, prev.params);
      return {
        ...prev,
        url: newUrl,
        params: updatedParams,
      };
    });
  };

  const handleParamsChange = (newParams: KeyValuePair[]) => {
    updateActiveRequest((prev) => {
      const updatedUrl = syncUrlWithParams(prev.url, newParams);
      return {
        ...prev,
        url: updatedUrl,
        params: newParams,
      };
    });
  };

  const handleHeadersChange = (newHeaders: KeyValuePair[]) => {
    updateActiveRequest((prev) => ({
      ...prev,
      headers: newHeaders,
    }));
  };

  const handleAuthChange = (newAuth: AuthConfig) => {
    updateActiveRequest((prev) => ({
      ...prev,
      auth: newAuth,
    }));
  };

  const handleMethodChange = (newMethod: HttpMethod) => {
    updateActiveRequest((prev) => {
      let bodyType = prev.bodyType;
      if (['POST', 'PUT', 'PATCH'].includes(newMethod) && bodyType === 'none') {
        bodyType = 'json';
      }
      return {
        ...prev,
        method: newMethod,
        bodyType,
      };
    });
  };

  const handleBodyTypeChange = (newType: BodyType) => {
    updateActiveRequest((prev) => {
      let updatedHeaders = [...prev.headers];
      const ctIndex = updatedHeaders.findIndex(
        (h) => h.key.toLowerCase() === 'content-type'
      );

      if (newType === 'json') {
        if (ctIndex >= 0) {
          updatedHeaders[ctIndex] = {
            ...updatedHeaders[ctIndex],
            value: 'application/json',
            enabled: true,
          };
        } else {
          updatedHeaders.push({
            id: Math.random().toString(36).substring(2, 9),
            key: 'Content-Type',
            value: 'application/json',
            enabled: true,
          });
        }
      } else if (newType === 'none' && ctIndex >= 0) {
        updatedHeaders.splice(ctIndex, 1);
      }

      return {
        ...prev,
        bodyType: newType,
        headers: updatedHeaders,
      };
    });
  };

  const handleBodyContentChange = (content: string) => {
    updateActiveRequest((prev) => ({
      ...prev,
      bodyContent: content,
    }));
  };

  const handleFormDataChange = (formData: FormDataItem[]) => {
    updateActiveRequest((prev) => ({
      ...prev,
      formData,
    }));
  };

  const handleUrlEncodedChange = (urlEncoded: KeyValuePair[]) => {
    updateActiveRequest((prev) => ({
      ...prev,
      urlEncoded,
    }));
  };

  const handleBinaryFileChange = (binaryFilePath?: string, binaryFileName?: string) => {
    updateActiveRequest((prev) => ({
      ...prev,
      binaryFilePath,
      binaryFileName,
    }));
  };

  const handleTestScriptChange = (testScript: string) => {
    updateActiveRequest((prev) => ({
      ...prev,
      testScript,
    }));
  };

  // Execution: Send Request (with Auth, Variables, & Test Assertions)
  const handleSendRequest = async () => {
    if (!activeTab || activeTab.isLoading) return;
    if (!activeTab.request.url.trim()) return;

    const interpolatedReq = interpolateRequest(activeTab.request, activeEnvironment);

    const { headers: effectiveHeadersList, params: effectiveParamsList } =
      applyAuthToHeadersAndParams(
        interpolatedReq.auth,
        interpolatedReq.headers,
        interpolatedReq.params
      );

    const finalUrl = syncUrlWithParams(interpolatedReq.url, effectiveParamsList);

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: true } : t))
    );

    const reqHeaders = keyValuesToRecord(effectiveHeadersList);
    let responseData: HttpResponse;

    try {
      if (window.interceptor?.sendRequest) {
        responseData = await window.interceptor.sendRequest({
          id: interpolatedReq.id,
          method: interpolatedReq.method,
          url: finalUrl,
          headers: reqHeaders,
          bodyType: interpolatedReq.bodyType,
          body: interpolatedReq.bodyType === 'json' || interpolatedReq.bodyType === 'text'
            ? interpolatedReq.bodyContent
            : undefined,
          formData: interpolatedReq.formData,
          urlEncoded: interpolatedReq.urlEncoded,
          binaryFilePath: interpolatedReq.binaryFilePath,
        });
      } else {
        const startTime = performance.now();
        const init: RequestInit = {
          method: interpolatedReq.method,
          headers: reqHeaders,
        };
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(interpolatedReq.method)) {
          if (interpolatedReq.bodyType === 'json' || interpolatedReq.bodyType === 'text') {
            init.body = interpolatedReq.bodyContent;
          }
        }

        const res = await fetch(finalUrl, init);
        const endTime = performance.now();
        const text = await res.text();
        const headersObj: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headersObj[k] = v;
        });

        let isJson = false;
        let data = text;
        try {
          data = JSON.parse(text);
          isJson = true;
        } catch {
          // not json
        }

        responseData = {
          status: res.status,
          statusText: res.statusText,
          headers: headersObj,
          data,
          rawBody: text,
          contentType: res.headers.get('content-type') || '',
          isJson,
          timeMs: Math.round(endTime - startTime),
          sizeBytes: new Blob([text]).size,
        };
      }
    } catch (err: any) {
      responseData = {
        status: 0,
        statusText: 'Error',
        headers: {},
        data: null,
        rawBody: err.message,
        contentType: 'text/plain',
        isJson: false,
        timeMs: 0,
        sizeBytes: 0,
        error: err.message,
      };
    }

    if (activeTab.request.testScript && activeTab.request.testScript.trim()) {
      const results = runTestScript(
        activeTab.request.testScript,
        responseData,
        handleSetEnvVarFromScript
      );
      responseData.testResults = results;
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, response: responseData, isLoading: false } : t
      )
    );

    const historyEntry: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      method: interpolatedReq.method,
      url: finalUrl,
      status: responseData.status,
      timeMs: responseData.timeMs,
      request: { ...activeTab.request },
      responseSummary: {
        sizeBytes: responseData.sizeBytes,
        statusText: responseData.statusText,
      },
    };

    setHistory((prev) => {
      const updated = [historyEntry, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('interceptor_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleCancelRequest = () => {
    if (window.interceptor?.cancelRequest && activeTab) {
      window.interceptor.cancelRequest(activeTab.request.id);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t))
    );
  };

  // Tab Management
  const handleNewTab = (protocol: RequestProtocol = 'http', customReq?: HttpRequest) => {
    const newId = `tab-${Date.now()}`;
    const initialReq = customReq || {
      ...DEFAULT_REQUEST,
      id: `req-${Date.now()}`,
      url: '{{baseUrl}}/posts',
    };
    const newTab: TabItem = {
      id: newId,
      title: protocol === 'websocket' ? 'WebSocket Echo' : `${initialReq.method} ${initialReq.name || 'New Request'}`,
      protocol,
      request: initialReq,
      response: null,
      isLoading: false,
      isDirty: false,
      wsUrl: 'wss://echo.websocket.org',
      wsStatus: 'disconnected',
      wsMessages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (idToClose: string) => {
    // If it was a websocket connection, close socket
    const existingWs = wsConnectionsRef.current.get(idToClose);
    if (existingWs) {
      existingWs.close();
      wsConnectionsRef.current.delete(idToClose);
    }

    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== idToClose);
    setTabs(remaining);
    if (activeTabId === idToClose) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleSelectFromSidebar = (req: HttpRequest, collectionId?: string, itemId?: string) => {
    const populatedReq = {
      ...req,
      collectionId: collectionId || req.collectionId,
      itemId: itemId || req.itemId,
    };

    if (
      activeTab.protocol === 'http' &&
      !activeTab.response &&
      activeTab.request.url === DEFAULT_REQUEST.url &&
      !activeTab.isDirty
    ) {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                title: `${populatedReq.method} ${populatedReq.name || 'Request'}`,
                request: populatedReq,
                isDirty: false,
              }
            : tab
        )
      );
    } else {
      handleNewTab('http', populatedReq);
    }
  };

  // WebSocket Actions
  const handleWsConnect = (url: string) => {
    const tabId = activeTabId;
    const existing = wsConnectionsRef.current.get(tabId);
    if (existing) {
      existing.close();
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              wsUrl: url,
              wsStatus: 'connecting',
              wsMessages: [
                ...(t.wsMessages || []),
                {
                  id: Math.random().toString(36).substring(2, 9),
                  timestamp: Date.now(),
                  type: 'system',
                  data: `Connecting to ${url}...`,
                  sizeBytes: 0,
                },
              ],
            }
          : t
      )
    );

    try {
      const ws = new WebSocket(url);
      wsConnectionsRef.current.set(tabId, ws);

      ws.onopen = () => {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  wsStatus: 'connected',
                  wsMessages: [
                    ...(t.wsMessages || []),
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      timestamp: Date.now(),
                      type: 'system',
                      data: `Connected to ${url}`,
                      sizeBytes: 0,
                    },
                  ],
                }
              : t
          )
        );
      };

      ws.onmessage = (event) => {
        const dataStr = typeof event.data === 'string' ? event.data : '[Binary Frame]';
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  wsMessages: [
                    ...(t.wsMessages || []),
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      timestamp: Date.now(),
                      type: 'received',
                      data: dataStr,
                      sizeBytes: new Blob([dataStr]).size,
                    },
                  ],
                }
              : t
          )
        );
      };

      ws.onerror = () => {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  wsStatus: 'error',
                  wsMessages: [
                    ...(t.wsMessages || []),
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      timestamp: Date.now(),
                      type: 'system',
                      data: 'WebSocket error occurred',
                      sizeBytes: 0,
                    },
                  ],
                }
              : t
          )
        );
      };

      ws.onclose = () => {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  wsStatus: 'disconnected',
                  wsMessages: [
                    ...(t.wsMessages || []),
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      timestamp: Date.now(),
                      type: 'system',
                      data: 'Connection closed',
                      sizeBytes: 0,
                    },
                  ],
                }
              : t
          )
        );
        wsConnectionsRef.current.delete(tabId);
      };
    } catch (err: any) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                wsStatus: 'error',
                wsMessages: [
                  ...(t.wsMessages || []),
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: Date.now(),
                    type: 'system',
                    data: `Failed to connect: ${err.message}`,
                    sizeBytes: 0,
                  },
                ],
              }
            : t
        )
      );
    }
  };

  const handleWsDisconnect = () => {
    const ws = wsConnectionsRef.current.get(activeTabId);
    if (ws) {
      ws.close();
      wsConnectionsRef.current.delete(activeTabId);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, wsStatus: 'disconnected' } : t))
    );
  };

  const handleWsSendMessage = (text: string) => {
    const ws = wsConnectionsRef.current.get(activeTabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(text);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                wsMessages: [
                  ...(t.wsMessages || []),
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: Date.now(),
                    type: 'sent',
                    data: text,
                    sizeBytes: new Blob([text]).size,
                  },
                ],
              }
            : t
        )
      );
    }
  };

  const handleWsClearMessages = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, wsMessages: [] } : t))
    );
  };

  // Save Request to Collection Flow
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

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('interceptor_history');
    } catch {
      // ignore
    }
  };

  // Keyboard Shortcuts (Cmd+Enter to send, Cmd+S to save, Cmd+T for tab, Cmd+W to close)
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, activeTab, collections, activeEnvironment]);

  const activeParamsCount = activeTab.request.params.filter(
    (p) => p.enabled && p.key.trim() !== ''
  ).length;
  const activeHeadersCount = activeTab.request.headers.filter(
    (h) => h.enabled && h.key.trim() !== ''
  ).length;
  const authSummary = getAuthSummary(activeTab.request.auth);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-[#e6edf3]">
      {/* Top Window Titlebar Header (Spans full window width, accommodates macOS traffic lights) */}
      <header
        className="h-10 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between px-3 select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Left Side: 80px clearance for macOS traffic lights + Interceptor branding */}
        <div
          className="flex items-center gap-2.5 pl-20"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="font-bold text-xs tracking-wider text-slate-100">INTERCEPTOR</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              v1.3
            </span>
          </div>
        </div>

        {/* Center: Window Title info */}
        <div className="text-[11px] font-medium text-slate-400 hidden md:flex items-center gap-2">
          <span>HTTP & WebSocket Client Workbench</span>
        </div>

        {/* Right Side: Environment Selector & Shortcuts */}
        <div
          className="flex items-center gap-3"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <EnvironmentSelector
            environments={environments}
            activeEnvId={activeEnvId}
            onSelectEnv={handleSetActiveEnv}
            onOpenManageModal={() => setIsEnvModalOpen(true)}
          />
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">⌘S Save</span>
            <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">⌘↵ Send</span>
          </div>
        </div>
      </header>

      {/* Main Content Area (Sidebar + Workspace side-by-side) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with Collections & History */}
        <Sidebar
          history={history}
          collections={collections}
          onSelectRequest={handleSelectFromSidebar}
          onClearHistory={handleClearHistory}
          onUpdateCollections={updateCollections}
          onNewRequestInCollection={handleNewRequestInCollection}
          onRunCollection={(col) => setCollectionToRun(col)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Request Tabs (HTTP & WebSocket) */}
          <RequestTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={(protocol) => handleNewTab(protocol || 'http')}
          />

        {/* Tab Content: Switch between HTTP Workbench & WebSocket Workbench */}
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
              isLoading={activeTab.isLoading}
              isDirty={activeTab.isDirty}
            />

            {/* Workbench Body: Split View (Editor on Top/Left, Response on Bottom/Right) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#30363d]">
              {/* Request Configuration Panel (Left / Top) */}
              <div className="flex-1 flex flex-col h-1/2 md:h-full overflow-hidden bg-[#161b22]">
                {/* Sub-tab navigation */}
                <div className="flex items-center px-3 border-b border-[#30363d] bg-[#0d1117] overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setConfigSubTab('params')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      configSubTab === 'params'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Params</span>
                    {activeParamsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[10px] flex items-center justify-center font-mono">
                        {activeParamsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setConfigSubTab('auth')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      configSubTab === 'auth'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Auth</span>
                    {authSummary !== 'None' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/30">
                        {authSummary}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setConfigSubTab('headers')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      configSubTab === 'headers'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Headers</span>
                    {activeHeadersCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[10px] flex items-center justify-center font-mono">
                        {activeHeadersCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setConfigSubTab('body')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      configSubTab === 'body'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Body</span>
                    {activeTab.request.bodyType !== 'none' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  <button
                    onClick={() => setConfigSubTab('tests')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      configSubTab === 'tests'
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Tests</span>
                    {activeTab.request.testScript && activeTab.request.testScript.trim() && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    )}
                  </button>
                </div>

                {/* Sub-tab Content Area */}
                <div className="flex-1 p-3 overflow-hidden bg-[#161b22]">
                  {configSubTab === 'params' && (
                    <KeyValueEditor
                      items={activeTab.request.params}
                      onChange={handleParamsChange}
                      keyPlaceholder="Parameter Name"
                      valuePlaceholder="Value (e.g. {{limit}})"
                    />
                  )}

                  {configSubTab === 'auth' && (
                    <AuthEditor
                      auth={activeTab.request.auth}
                      onChange={handleAuthChange}
                    />
                  )}

                  {configSubTab === 'headers' && (
                    <KeyValueEditor
                      items={activeTab.request.headers}
                      onChange={handleHeadersChange}
                      keyPlaceholder="Header Name (e.g. Authorization)"
                      valuePlaceholder="Header Value (e.g. Bearer {{apiKey}})"
                    />
                  )}

                  {configSubTab === 'body' && (
                    <BodyEditor
                      bodyType={activeTab.request.bodyType}
                      onBodyTypeChange={handleBodyTypeChange}
                      bodyContent={activeTab.request.bodyContent}
                      onBodyContentChange={handleBodyContentChange}
                      formData={activeTab.request.formData}
                      onFormDataChange={handleFormDataChange}
                      urlEncoded={activeTab.request.urlEncoded}
                      onUrlEncodedChange={handleUrlEncodedChange}
                      binaryFilePath={activeTab.request.binaryFilePath}
                      binaryFileName={activeTab.request.binaryFileName}
                      onBinaryFileChange={handleBinaryFileChange}
                    />
                  )}

                  {configSubTab === 'tests' && (
                    <TestScriptEditor
                      script={activeTab.request.testScript || ''}
                      onChange={handleTestScriptChange}
                    />
                  )}
                </div>
              </div>

              {/* Response Inspector Panel (Right / Bottom) */}
              <div className="flex-1 flex flex-col h-1/2 md:h-full overflow-hidden bg-[#0d1117]">
                <ResponseViewer
                  response={activeTab.response}
                  isLoading={activeTab.isLoading}
                  activeUrl={activeTab.request.url}
                />
              </div>
            </div>
          </div>
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

      {/* Collection Runner Modal (Newman-style) */}
      <CollectionRunnerModal
        isOpen={!!collectionToRun}
        onClose={() => setCollectionToRun(null)}
        collection={collectionToRun}
        environments={environments}
        activeEnvId={activeEnvId}
      />
    </div>
  );
};
export default App;
