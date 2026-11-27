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
import { RequestBodyModeDropdown } from './components/RequestBodyModeDropdown';
import { InterceptorLogo } from './components/InterceptorLogo';
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
import { Toast, ToastData } from './components/Toast';
import { ParsedCurlResult } from './utils/curlParser';
import {
  Shield,
  CheckSquare,
  Radio,
  Columns2,
  Rows2,
  RotateCcw,
  PanelLeft,
  Box,
  ChevronDown,
  GitFork,
  MoreHorizontal,
  Settings,
  Key,
  Sparkles,
  Search,
  Cookie,
  Terminal,
} from 'lucide-react';

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
  const [configSubTab, setConfigSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'vars' | 'script' | 'assert' | 'tests'>('params');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [collectionToRun, setCollectionToRun] = useState<Collection | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((toastData: Omit<ToastData, 'id'>) => {
    setToast({
      ...toastData,
      id: Math.random().toString(36).substring(2, 9),
    });
  }, []);

  // Window Maximized / Fullscreen State
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state from Electron
    if (window.interceptor?.isMaximized) {
      window.interceptor.isMaximized().then(setIsMaximized);
    }

    // Subscribe to IPC window state updates
    let unsubscribe: (() => void) | undefined;
    if (window.interceptor?.onWindowStateChange) {
      unsubscribe = window.interceptor.onWindowStateChange((maximized) => {
        setIsMaximized(maximized);
      });
    }

    // Native resize listener for window maximize / fullscreen
    const handleResize = () => {
      if (window.interceptor?.isMaximized) {
        window.interceptor.isMaximized().then(setIsMaximized);
      } else {
        const isMax =
          Boolean(document.fullscreenElement) ||
          (window.innerWidth >= window.screen.availWidth - 10 &&
            window.innerHeight >= window.screen.availHeight - 30);
        setIsMaximized(isMax);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // Flexible & Customizable Layout State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('interceptor_sidebar_width');
      return saved ? Math.max(180, Math.min(550, parseInt(saved, 10))) : 260;
    } catch {
      return 260;
    }
  });

  const [workbenchLayout, setWorkbenchLayout] = useState<'horizontal' | 'vertical'>(() => {
    try {
      const saved = localStorage.getItem('interceptor_workbench_layout');
      return saved === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [editorRatio, setEditorRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('interceptor_editor_ratio');
      return saved ? Math.max(0.2, Math.min(0.8, parseFloat(saved))) : 0.5;
    } catch {
      return 0.5;
    }
  });

  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingEditor, setIsDraggingEditor] = useState(false);
  const workbenchContainerRef = useRef<HTMLDivElement>(null);

  // Persistence for layout
  useEffect(() => {
    try {
      localStorage.setItem('interceptor_sidebar_width', sidebarWidth.toString());
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('interceptor_workbench_layout', workbenchLayout);
    } catch {
      // ignore
    }
  }, [workbenchLayout]);

  useEffect(() => {
    try {
      localStorage.setItem('interceptor_editor_ratio', editorRatio.toString());
    } catch {
      // ignore
    }
  }, [editorRatio]);

  // Sidebar Drag Resizing
  const handleStartSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(550, startWidth + (moveEvent.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  // Editor vs Response Splitter Drag Resizing
  const handleStartEditorResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingEditor(true);
    const container = workbenchContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (workbenchLayout === 'horizontal') {
        const relativeX = moveEvent.clientX - rect.left;
        const ratio = Math.max(0.2, Math.min(0.8, relativeX / rect.width));
        setEditorRatio(ratio);
      } else {
        const relativeY = moveEvent.clientY - rect.top;
        const ratio = Math.max(0.2, Math.min(0.8, relativeY / rect.height));
        setEditorRatio(ratio);
      }
    };

    const onMouseUp = () => {
      setIsDraggingEditor(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [workbenchLayout]);

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

  // Handle cURL Import from RequestBar paste
  const handleImportCurl = useCallback(
    (parsed: ParsedCurlResult) => {
      updateActiveRequest((prev) => {
        let newName = prev.name;
        if (!newName || newName === 'New Request') {
          const cleanPath = parsed.url.replace(/^https?:\/\//, '').split('?')[0];
          newName = `${parsed.method} ${cleanPath.slice(0, 30)}`;
        }
        return {
          ...prev,
          name: newName,
          method: parsed.method,
          url: parsed.url,
          params: parsed.params,
          headers: parsed.headers,
          auth: parsed.auth,
          bodyType: parsed.bodyType,
          bodyContent: parsed.bodyContent,
          urlEncoded: parsed.urlEncoded,
          formData: parsed.formData,
        };
      });

      // Switch to relevant subtab
      if (parsed.bodyType !== 'none') {
        setConfigSubTab('body');
      } else if (parsed.auth && parsed.auth.type !== 'none') {
        setConfigSubTab('auth');
      } else if (parsed.headers.length > 0) {
        setConfigSubTab('headers');
      } else if (parsed.params.length > 0) {
        setConfigSubTab('params');
      }

      // Show toast
      const cleanPath = parsed.url.replace(/^https?:\/\//, '').split('?')[0];
      const summaryDetails = [
        parsed.headers.length > 0 ? `${parsed.headers.length} header${parsed.headers.length > 1 ? 's' : ''}` : null,
        parsed.params.length > 0 ? `${parsed.params.length} param${parsed.params.length > 1 ? 's' : ''}` : null,
        parsed.auth && parsed.auth.type !== 'none' ? `${parsed.auth.type} auth` : null,
        parsed.bodyType !== 'none' ? `body (${parsed.bodyType})` : null,
      ].filter(Boolean).join(', ');

      showToast({
        type: 'success',
        title: `cURL imported: ${parsed.method} ${cleanPath.slice(0, 35) || 'request'}`,
        message: summaryDetails || 'All request components populated successfully',
      });
    },
    [updateActiveRequest, showToast]
  );

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

  const handlePrettifyBody = () => {
    const raw = activeTab.request.bodyContent;
    if (!raw || !raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      handleBodyContentChange(JSON.stringify(parsed, null, 2));
      showToast({ type: 'success', title: 'Formatted JSON', message: 'Indented with 2 spaces' });
    } catch {
      showToast({ type: 'error', title: 'Unable to Prettify', message: 'Invalid JSON format' });
    }
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
      const causeText = err.cause
        ? (typeof err.cause === 'object' ? (err.cause.code || err.cause.message || JSON.stringify(err.cause)) : String(err.cause))
        : '';
      const detailedError = causeText
        ? `${err.message || 'Request failed'}: ${causeText}`
        : (err.message || 'Unknown network error');

      responseData = {
        status: 0,
        statusText: 'Error',
        headers: {},
        data: null,
        rawBody: detailedError,
        contentType: 'text/plain',
        isJson: false,
        timeMs: 0,
        sizeBytes: 0,
        error: detailedError,
      };
    }

    if (activeTab.request.testScript && activeTab.request.testScript.trim()) {
      const results = runTestScript(
        activeTab.request.testScript,
        responseData,
        handleSetEnvVarFromScript,
        activeEnvironment,
        environments
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
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

  // Active collection for Bruno-style CollectionHeader badge
  const activeCollection = collections.find((col) =>
    col.items.some((item) =>
      item.type === 'request'
        ? item.request.id === activeTab.request.id || item.id === activeTab.request.itemId
        : item.children?.some((child) => child.request.id === activeTab.request.id || child.id === activeTab.request.itemId)
    )
  ) || collections[0];
  const activeCollectionName = activeCollection?.name;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a] text-[#cccccc]">
      {/* Top Window Titlebar Header (Spans full window width, Bruno-style dark seamless titlebar) */}
      <header
        className="relative h-9 bg-[#1a1a1a] flex items-center justify-between px-3 select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Left Side: Workspace Selector (Bruno style) */}
        <div
          className={`flex items-center gap-2.5 transition-all duration-150 ${isMaximized ? 'pl-2' : 'pl-20'}`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#26292b] rounded cursor-pointer transition-colors font-medium select-none">
            <span>My Workspace</span>
            <ChevronDown className="w-3 h-3 text-[#777777]" />
          </div>
        </div>

        {/* Center: Interceptor App Logo Branding */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex items-center gap-1.5">
          <InterceptorLogo size={16} />
          <span className="font-semibold text-xs tracking-wide text-[#cccccc] font-sans">Interceptor</span>
        </div>

        {/* Right Side: Layout Controls & Panel Toggles */}
        <div
          className="flex items-center gap-2.5"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* Layout Customizer Controls */}
          <div className="flex items-center gap-1 bg-[#222224] p-0.5 rounded border border-[#333333]">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1 rounded transition-colors cursor-pointer ${!isSidebarCollapsed
                ? 'bg-[#d99b26]/20 text-[#d99b26]'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
                }`}
              title={isSidebarCollapsed ? 'Show Sidebar (⌘B)' : 'Hide Sidebar (⌘B)'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[#333333] mx-0.5" />
            <button
              onClick={() => setWorkbenchLayout('horizontal')}
              className={`p-1 rounded transition-colors cursor-pointer ${workbenchLayout === 'horizontal'
                ? 'bg-[#d99b26] text-white shadow-xs'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
                }`}
              title="3 Columns Layout (Side-by-side Request & Response)"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWorkbenchLayout('vertical')}
              className={`p-1 rounded transition-colors cursor-pointer ${workbenchLayout === 'vertical'
                ? 'bg-[#d99b26] text-white shadow-xs'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
                }`}
              title="Stacked Layout (Request Top / Response Bottom)"
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[#333333] mx-0.5" />
            <button
              onClick={() => {
                setSidebarWidth(260);
                setEditorRatio(0.5);
              }}
              className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#2e3235] transition-colors cursor-pointer"
              title="Reset Layout & Column Widths (50/50)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Sidebar + Workspace side-by-side) */}
      <div
        className={`flex-1 flex overflow-hidden ${isDraggingSidebar || isDraggingEditor ? 'select-none pointer-events-auto' : ''
          }`}
      >
        {/* Column 1: Sidebar with Collections & History (Smooth Animated Slide Drawer) */}
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
              onSelectRequest={handleSelectFromSidebar}
              onClearHistory={handleClearHistory}
              onUpdateCollections={updateCollections}
              onNewRequestInCollection={handleNewRequestInCollection}
              onRunCollection={(col) => setCollectionToRun(col)}
              environments={environments}
              activeEnvId={activeEnvId}
              activeItemId={activeTab.protocol === 'http' ? activeTab.request.itemId || activeTab.request.id : undefined}
              width={sidebarWidth}
            />
          </div>
        </div>

        {/* Splitter 1: Sidebar Resizer Handle (Smooth transition with sidebar) */}
        <div
          onMouseDown={!isSidebarCollapsed ? handleStartSidebarResize : undefined}
          className={`z-20 select-none group flex items-center justify-center shrink-0 border-r border-[#333333] ${isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'
            } ${isSidebarCollapsed
              ? 'w-0 opacity-0 pointer-events-none border-transparent'
              : 'w-1.5 -ml-1 cursor-col-resize hover:bg-[#d99b26] active:bg-[#d99b26]'
            } ${isDraggingSidebar ? 'bg-[#d99b26]' : ''}`}
          title="Drag to resize sidebar (Double click to reset to 260px)"
          onDoubleClick={() => setSidebarWidth(260)}
        >
          {!isSidebarCollapsed && (
            <div className="w-0.5 h-6 rounded-full bg-[#444444] group-hover:bg-[#d99b26] transition-colors" />
          )}
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#1a1a1a]">
          {/* Collection Header (Bruno-style directly above tabs, matching Image 4) */}
          <div className="flex items-center justify-between px-4 h-9 bg-[#1a1a1a] border-b border-[#333333] shrink-0 select-none">
            {/* Left: Active collection dropdown */}
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#26292b] rounded cursor-pointer transition-colors font-medium">
              <Box className="w-3.5 h-3.5 text-[#999999]" />
              <span>{activeCollectionName || 'Test'}</span>
              <ChevronDown className="w-3 h-3 text-[#777777]" />
            </div>

            {/* Right: Git, Shield, More, Environment Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast({ type: 'info', title: 'Git Integration', message: 'Git repository tracking active.' })}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#888888] hover:text-[#cccccc] hover:bg-[#26292b] border border-[#333333] rounded transition-colors cursor-pointer"
                title="Initialize Git repository"
              >
                <GitFork className="w-3.5 h-3.5 text-[#d99b26]" />
                <span>Initialize Git</span>
              </button>

              <button
                className="p-1.5 text-[#888888] hover:text-emerald-400 hover:bg-[#26292b] rounded transition-colors cursor-pointer"
                title="Safe Sandbox Active"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                className="p-1 text-[#888888] hover:text-[#cccccc] hover:bg-[#26292b] border border-[#333333] rounded transition-colors cursor-pointer"
                title="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              <EnvironmentSelector
                environments={environments}
                activeEnvId={activeEnvId}
                onSelectEnv={handleSetActiveEnv}
                onOpenManageModal={() => setIsEnvModalOpen(true)}
              />
            </div>
          </div>

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
                onImportCurl={handleImportCurl}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                isLoading={activeTab.isLoading}
                isDirty={activeTab.isDirty}
              />

              {/* Workbench Body: Flexible Split View (Horizontal 3-column or Vertical Stacked) */}
              <div
                ref={workbenchContainerRef}
                className={`flex-1 flex overflow-hidden ${workbenchLayout === 'horizontal' ? 'flex-row' : 'flex-col'
                  }`}
              >
                {/* Column 2: Request Configuration Panel */}
                <div
                  style={
                    workbenchLayout === 'horizontal'
                      ? { width: `${editorRatio * 100}%` }
                      : { height: `${editorRatio * 100}%` }
                  }
                  className="flex flex-col overflow-hidden bg-[#1a1a1a] shrink-0 min-w-[200px] min-h-[100px]"
                >
                  {/* Sub-tab navigation (Bruno-style ResponsiveTabs, matching Image 2) */}
                  <div className="flex items-center justify-between px-4 bg-[#1a1a1a] select-none h-9 shrink-0">
                    <div className="flex items-center h-full gap-5">
                      <button
                        onClick={() => setConfigSubTab('params')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'params'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Params</span>
                        {activeParamsCount > 0 && (
                          <sup className="font-medium text-[10px] ml-0.5">{activeParamsCount}</sup>
                        )}
                      </button>

                      <button
                        onClick={() => setConfigSubTab('body')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'body'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Body</span>
                        {activeTab.request.bodyType !== 'none' && (
                          <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
                        )}
                      </button>

                      <button
                        onClick={() => setConfigSubTab('headers')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'headers'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Headers</span>
                        {activeHeadersCount > 0 && (
                          <sup className="font-medium text-[10px] ml-0.5">{activeHeadersCount}</sup>
                        )}
                      </button>

                      <button
                        onClick={() => setConfigSubTab('auth')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'auth'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Auth</span>
                        {activeTab.request.auth?.type && activeTab.request.auth.type !== 'none' && (
                          <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
                        )}
                      </button>

                      <button
                        onClick={() => setConfigSubTab('vars')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'vars'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Vars</span>
                      </button>

                      <button
                        onClick={() => setConfigSubTab('script')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'script'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Script</span>
                        {activeTab.request.testScript && activeTab.request.testScript.trim() !== '' && (
                          <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
                        )}
                      </button>

                      <button
                        onClick={() => setConfigSubTab('assert')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'assert'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Assert</span>
                      </button>

                      <button
                        onClick={() => setConfigSubTab('tests')}
                        className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${configSubTab === 'tests'
                          ? 'border-[#d99b26] text-white font-medium'
                          : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                          }`}
                      >
                        <span>Tests</span>
                        {activeTab.request.testScript && activeTab.request.testScript.trim() !== '' && (
                          <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => showToast({ type: 'info', title: 'More Options', message: 'Docs and settings available' })}
                        className="text-xs text-[#888888] hover:text-white transition-colors cursor-pointer"
                        title="More tabs"
                      >
                        »
                      </button>
                    </div>

                    {/* Right side helper when Body is selected (matches Image 5 & 6) */}
                    {configSubTab === 'body' && (
                      <RequestBodyModeDropdown
                        bodyMode={activeTab.request.bodyType}
                        onModeChange={handleBodyTypeChange}
                        onPrettify={handlePrettifyBody}
                      />
                    )}
                  </div>

                  {/* Sub-tab view body */}
                  <div className="flex-1 overflow-auto bg-[#1a1a1a]">
                    {configSubTab === 'params' && (
                      <KeyValueEditor
                        items={activeTab.request.params}
                        onChange={handleParamsChange}
                        title="Query"
                        keyPlaceholder="Name"
                        valuePlaceholder="Value"
                        descriptionPlaceholder="Description"
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                      />
                    )}

                    {configSubTab === 'auth' && (
                      <AuthEditor
                        auth={activeTab.request.auth}
                        onChange={handleAuthChange}
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                      />
                    )}

                    {configSubTab === 'headers' && (
                      <KeyValueEditor
                        items={activeTab.request.headers}
                        onChange={handleHeadersChange}
                        title="Headers"
                        keyPlaceholder="Name"
                        valuePlaceholder="Value"
                        descriptionPlaceholder="Description"
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
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
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                      />
                    )}

                    {configSubTab === 'vars' && (
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
                          <span className="font-semibold text-xs text-[#888888]">Request Variables</span>
                          <button
                            onClick={() => setIsEnvModalOpen(true)}
                            className="text-xs text-[#3b82f6] hover:underline cursor-pointer"
                          >
                            Manage Environments
                          </button>
                        </div>
                        <p className="text-xs text-[#888888]">
                          Active Environment: <strong className="text-white">{activeEnvironment?.name || 'No Environment'}</strong>
                        </p>
                        {activeEnvironment?.variables && activeEnvironment.variables.length > 0 ? (
                          <div className="border border-[#333333] rounded overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-[#222224] text-[#888888] h-7 border-b border-[#333333]">
                                  <th className="px-3 text-left font-normal">Name</th>
                                  <th className="px-3 text-left font-normal">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeEnvironment.variables.map((v) => (
                                  <tr key={v.id} className="h-7 border-b border-[#333333]/50 hover:bg-[#222224]">
                                    <td className="px-3 font-mono text-[#d99b26]">{v.key}</td>
                                    <td className="px-3 font-mono text-[#cccccc]">{v.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-[#666666] italic">No environment variables defined.</p>
                        )}
                      </div>
                    )}

                    {(configSubTab === 'script' || configSubTab === 'assert' || configSubTab === 'tests') && (
                      <TestScriptEditor
                        script={activeTab.request.testScript || ''}
                        onChange={handleTestScriptChange}
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={() => setIsEnvModalOpen(true)}
                      />
                    )}
                  </div>
                </div>

                {/* Splitter 2: Editor vs Response Resizer Handle */}
                <div
                  onMouseDown={handleStartEditorResize}
                  className={`z-20 select-none group flex items-center justify-center shrink-0 ${workbenchLayout === 'horizontal'
                    ? 'w-1.5 -ml-1 cursor-col-resize hover:bg-[#d99b26] active:bg-[#d99b26] border-r border-[#333333]'
                    : 'h-1.5 -mt-1 cursor-row-resize hover:bg-[#d99b26] active:bg-[#d99b26] border-b border-[#333333]'
                    } ${isDraggingEditor ? 'bg-[#d99b26]' : ''}`}
                  title={`Drag to resize ${workbenchLayout === 'horizontal' ? 'columns' : 'rows'}`}
                  onDoubleClick={() => setEditorRatio(0.5)}
                >
                  <div
                    className={`rounded-full bg-[#444444] group-hover:bg-[#d99b26] transition-colors ${workbenchLayout === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
                      }`}
                  />
                </div>

                {/* Column 3: Response Viewer Panel */}
                <div
                  style={
                    workbenchLayout === 'horizontal'
                      ? { width: `${(1 - editorRatio) * 100}%` }
                      : { height: `${(1 - editorRatio) * 100}%` }
                  }
                  className="flex flex-col overflow-hidden bg-[#1a1a1a] shrink-0 min-w-[250px] min-h-[100px]"
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

      {/* Bottom Status Bar (Bruno-style full width status bar, matching Image 4) */}
      <footer className="h-6 bg-[#1a1a1a] border-t border-[#333333] text-[11px] text-[#888888] flex items-center justify-between px-3 select-none shrink-0 z-30">
        {/* Left: Preferences, Shortcuts, Git, Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEnvModalOpen(true)}
            className="flex items-center text-[#888888] hover:text-white transition-colors cursor-pointer"
            title="Preferences & Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEnvModalOpen(true)}
            className="flex items-center text-[#888888] hover:text-white transition-colors cursor-pointer"
            title="Environment Variables (⌘E)"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.open?.('https://github.com/usebruno/bruno', '_blank')}
            className="flex items-center text-[#888888] hover:text-white transition-colors cursor-pointer"
            title="GitHub Repository"
          >
            <GitFork className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-[#333333]" />
          <div className="flex items-center gap-1 text-[#d99b26] font-medium cursor-pointer hover:underline text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>Try Interceptor Pro</span>
          </div>
        </div>

        {/* Right: Search, Cookies, Dev Tools, Version */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => showToast({ type: 'info', title: 'Global Search', message: 'Press ⌘F to search across requests' })}
            className="flex items-center gap-1 text-[#888888] hover:text-[#cccccc] transition-colors cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
          </button>

          <button
            onClick={() => showToast({ type: 'info', title: 'Cookie Manager', message: 'Cookie store synchronized.' })}
            className="flex items-center gap-1 text-[#888888] hover:text-[#cccccc] transition-colors cursor-pointer"
          >
            <Cookie className="w-3 h-3" />
            <span>Cookies</span>
          </button>

          <button
            onClick={() => {
              if ((window as any).interceptor?.openDevTools) {
                (window as any).interceptor.openDevTools();
              } else {
                showToast({ type: 'info', title: 'Dev Tools', message: 'Developer tools available in Electron.' });
              }
            }}
            className="flex items-center gap-1 text-[#888888] hover:text-[#cccccc] transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
            <span>Dev Tools</span>
          </button>

          <div className="w-px h-3 bg-[#333333]" />
          <span className="font-mono text-[#666666] text-[10px]">v1.2.0</span>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
export default App;
