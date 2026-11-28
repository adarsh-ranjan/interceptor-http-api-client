import { useState, useRef, useCallback, useMemo } from 'react';
import {
  HttpRequest,
  HttpResponse,
  TabItem,
  Environment,
  HttpMethod,
  KeyValuePair,
  BodyType,
  AuthConfig,
  FormDataItem,
  RequestProtocol,
  HistoryItem,
} from '../types';
import { DEFAULT_REQUEST } from '../utils/defaults';
import {
  syncUrlWithParams,
  extractParamsFromUrl,
  keyValuesToRecord,
} from '../utils/http';
import { interpolateRequest } from '../utils/variables';
import { applyAuthToHeadersAndParams } from '../utils/auth';
import { runTestScript } from '../utils/testRunner';
import { ParsedCurlResult } from '../utils/curlParser';
import { MockServer, ServerLogEntry } from '../types/server';

interface UseRequestTabsOptions {
  activeEnvironment?: Environment;
  environments: Environment[];
  onSetEnvVarFromScript: (key: string, value: string) => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  onShowToast: (toast: { type: 'info' | 'success' | 'error'; title: string; message: string }) => void;
  onSelectSubTab: (subTab: any) => void;
  mockServers: MockServer[];
  onSetMainView: (view: 'requests' | 'mock-servers') => void;
}

export function useRequestTabs({
  activeEnvironment,
  environments,
  onSetEnvVarFromScript,
  onAddHistoryItem,
  onShowToast,
  onSelectSubTab,
  mockServers,
  onSetMainView,
}: UseRequestTabsOptions) {
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

  const wsConnectionsRef = useRef<Map<string, WebSocket>>(new Map());

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const updateActiveRequest = useCallback(
    (updater: (prevReq: HttpRequest) => HttpRequest) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id === activeTabId) {
            const updatedReq = updater(tab.request);
            const updatedTitle =
              updatedReq.name && updatedReq.name !== 'New Request'
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

  const handleMethodChange = (newMethod: HttpMethod) => {
    updateActiveRequest((prev) => ({
      ...prev,
      method: newMethod,
    }));
  };

  const handleParamsChange = (newParams: KeyValuePair[]) => {
    updateActiveRequest((prev) => {
      const newUrl = syncUrlWithParams(prev.url, newParams);
      return {
        ...prev,
        url: newUrl,
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

  const handleBodyTypeChange = (newType: BodyType) => {
    updateActiveRequest((prev) => {
      const updatedHeaders = [...prev.headers];
      const ctIndex = updatedHeaders.findIndex((h) => h.key.toLowerCase() === 'content-type');

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
      onShowToast({ type: 'success', title: 'Formatted JSON', message: 'Indented with 2 spaces' });
    } catch {
      onShowToast({ type: 'error', title: 'Unable to Prettify', message: 'Invalid JSON format' });
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
          body:
            interpolatedReq.bodyType === 'json' || interpolatedReq.bodyType === 'text'
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
        ? typeof err.cause === 'object'
          ? err.cause.code || err.cause.message || JSON.stringify(err.cause)
          : String(err.cause)
        : '';
      const detailedError = causeText
        ? `${err.message || 'Request failed'}: ${causeText}`
        : err.message || 'Unknown network error';

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
        onSetEnvVarFromScript,
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

    onAddHistoryItem(historyEntry);
  };

  const handleCancelRequest = () => {
    if (window.interceptor?.cancelRequest && activeTab) {
      window.interceptor.cancelRequest(activeTab.request.id);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t))
    );
  };

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

      if (parsed.bodyType !== 'none') {
        onSelectSubTab('body');
      } else if (parsed.auth && parsed.auth.type !== 'none') {
        onSelectSubTab('auth');
      } else if (parsed.headers.length > 0) {
        onSelectSubTab('headers');
      } else if (parsed.params.length > 0) {
        onSelectSubTab('params');
      }

      const cleanPath = parsed.url.replace(/^https?:\/\//, '').split('?')[0];
      const summaryDetails = [
        parsed.headers.length > 0 ? `${parsed.headers.length} header${parsed.headers.length > 1 ? 's' : ''}` : null,
        parsed.params.length > 0 ? `${parsed.params.length} param${parsed.params.length > 1 ? 's' : ''}` : null,
        parsed.auth && parsed.auth.type !== 'none' ? `${parsed.auth.type} auth` : null,
        parsed.bodyType !== 'none' ? `body (${parsed.bodyType})` : null,
      ].filter(Boolean).join(', ');

      onShowToast({
        type: 'success',
        title: `cURL imported: ${parsed.method} ${cleanPath.slice(0, 35) || 'request'}`,
        message: summaryDetails || 'All request components populated successfully',
      });
    },
    [updateActiveRequest, onSelectSubTab, onShowToast]
  );

  const handleReplayInClient = (log: ServerLogEntry) => {
    const currentServer = mockServers.find((s) => s.id === log.serverId);
    const port = currentServer ? currentServer.port : 3001;
    const queryStr =
      Object.keys(log.requestQuery || {}).length > 0
        ? '?' + new URLSearchParams(log.requestQuery as Record<string, string>).toString()
        : '';
    const fullUrl = `http://localhost:${port}${log.path}${queryStr}`;

    const queryParams: KeyValuePair[] = Object.entries(log.requestQuery || {}).map(([key, value]) => ({
      id: `param-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      key,
      value: String(value),
      enabled: true,
    }));

    const headerParams: KeyValuePair[] = Object.entries(log.requestHeaders || {})
      .filter(([k]) => !k.startsWith(':') && k.toLowerCase() !== 'host' && k.toLowerCase() !== 'connection')
      .map(([key, value]) => ({
        id: `header-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        key,
        value: String(value),
        enabled: true,
      }));

    let bodyContent = '';
    let bodyType: BodyType = 'none';

    if (log.requestBody) {
      if (typeof log.requestBody === 'object') {
        bodyContent = JSON.stringify(log.requestBody, null, 2);
        bodyType = 'json';
      } else {
        bodyContent = String(log.requestBody);
        bodyType = 'text';
      }
    }

    const newReq: HttpRequest = {
      ...DEFAULT_REQUEST,
      id: `req-${Date.now()}`,
      name: `${log.method} ${log.path}`,
      method: (log.method || 'GET') as HttpMethod,
      url: fullUrl,
      params: queryParams,
      headers: headerParams,
      bodyType,
      bodyContent,
      auth: { type: 'none' },
      protocol: 'http',
    };

    handleNewTab('http', newReq);
    onSetMainView('requests');
    onShowToast({
      type: 'success',
      title: 'Opened in Client',
      message: `Opened ${log.method} ${log.path} in a new request tab`,
    });
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

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    updateActiveRequest,
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
  };
}
