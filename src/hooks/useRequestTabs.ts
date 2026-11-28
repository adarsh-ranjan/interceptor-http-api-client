import { useCallback, useRef, useState } from 'react';
import { DEFAULT_REQUEST, DEFAULT_WS_URL } from '../constants/defaults';
import { cancelHttpRequest, executePreparedRequest } from '../services/httpClient';
import {
  AuthConfig,
  BodyType,
  Environment,
  FormDataItem,
  HistoryItem,
  HttpMethod,
  HttpRequest,
  KeyValuePair,
  RequestProtocol,
  TabItem,
  WebSocketMessage,
  WebSocketStatus,
} from '../types';
import { ServerLogEntry } from '../types/server';
import { ParsedCurlResult } from '../utils/curlParser';
import { extractParamsFromUrl, syncUrlWithParams } from '../utils/http';
import { generateId } from '../utils/id';
import { serverLogToHttpRequest } from '../utils/mockServerMapping';
import { ToastData } from '../components/Toast';

export type ConfigSubTab =
  | 'params'
  | 'auth'
  | 'headers'
  | 'body'
  | 'vars'
  | 'script'
  | 'assert'
  | 'tests';

interface UseRequestTabsOptions {
  activeEnvironment?: Environment;
  environments: Environment[];
  onSetEnvVarFromScript: (key: string, value: string) => void;
  onAddHistoryEntry: (entry: HistoryItem) => void;
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

function buildTabTitle(req: HttpRequest): string {
  const label =
    req.name && req.name !== 'New Request'
      ? req.name
      : req.url
        ? req.url.replace(/^https?:\/\//, '').split('?')[0].slice(-24)
        : 'New Request';
  return `${req.method} ${label}`;
}

export function useRequestTabs({
  activeEnvironment,
  environments,
  onSetEnvVarFromScript,
  onAddHistoryEntry,
  showToast,
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
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>('params');

  const wsConnectionsRef = useRef<Map<string, WebSocket>>(new Map());
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const updateActiveRequest = useCallback(
    (updater: (prevReq: HttpRequest) => HttpRequest) => {
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab;
          const updatedReq = updater(tab.request);
          return {
            ...tab,
            title: buildTabTitle(updatedReq),
            request: updatedReq,
            isDirty: true,
          };
        })
      );
    },
    [activeTabId]
  );

  const markActiveTabSaved = useCallback(
    (savedRequest: HttpRequest) => {
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
    },
    [activeTabId]
  );

  const clearActiveTabDirty = useCallback(() => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)));
  }, [activeTabId]);

  const handleUrlChange = useCallback(
    (newUrl: string) => {
      updateActiveRequest((prev) => ({
        ...prev,
        url: newUrl,
        params: extractParamsFromUrl(newUrl, prev.params),
      }));
    },
    [updateActiveRequest]
  );

  const handleParamsChange = useCallback(
    (newParams: KeyValuePair[]) => {
      updateActiveRequest((prev) => ({
        ...prev,
        url: syncUrlWithParams(prev.url, newParams),
        params: newParams,
      }));
    },
    [updateActiveRequest]
  );

  const handleHeadersChange = useCallback(
    (newHeaders: KeyValuePair[]) => {
      updateActiveRequest((prev) => ({ ...prev, headers: newHeaders }));
    },
    [updateActiveRequest]
  );

  const handleAuthChange = useCallback(
    (newAuth: AuthConfig) => {
      updateActiveRequest((prev) => ({ ...prev, auth: newAuth }));
    },
    [updateActiveRequest]
  );

  const handleMethodChange = useCallback(
    (newMethod: HttpMethod) => {
      updateActiveRequest((prev) => {
        const bodyType =
          ['POST', 'PUT', 'PATCH'].includes(newMethod) && prev.bodyType === 'none'
            ? 'json'
            : prev.bodyType;
        return { ...prev, method: newMethod, bodyType };
      });
    },
    [updateActiveRequest]
  );

  const handleBodyTypeChange = useCallback(
    (newType: BodyType) => {
      updateActiveRequest((prev) => {
        const updatedHeaders = [...prev.headers];
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
              id: generateId(),
              key: 'Content-Type',
              value: 'application/json',
              enabled: true,
            });
          }
        } else if (newType === 'none' && ctIndex >= 0) {
          updatedHeaders.splice(ctIndex, 1);
        }

        return { ...prev, bodyType: newType, headers: updatedHeaders };
      });
    },
    [updateActiveRequest]
  );

  const handleBodyContentChange = useCallback(
    (content: string) => {
      updateActiveRequest((prev) => ({ ...prev, bodyContent: content }));
    },
    [updateActiveRequest]
  );

  const handlePrettifyBody = useCallback(() => {
    const raw = activeTab.request.bodyContent;
    if (!raw || !raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      handleBodyContentChange(JSON.stringify(parsed, null, 2));
      showToast({ type: 'success', title: 'Formatted JSON', message: 'Indented with 2 spaces' });
    } catch {
      showToast({ type: 'error', title: 'Unable to Prettify', message: 'Invalid JSON format' });
    }
  }, [activeTab.request.bodyContent, handleBodyContentChange, showToast]);

  const handleFormDataChange = useCallback(
    (formData: FormDataItem[]) => {
      updateActiveRequest((prev) => ({ ...prev, formData }));
    },
    [updateActiveRequest]
  );

  const handleUrlEncodedChange = useCallback(
    (urlEncoded: KeyValuePair[]) => {
      updateActiveRequest((prev) => ({ ...prev, urlEncoded }));
    },
    [updateActiveRequest]
  );

  const handleBinaryFileChange = useCallback(
    (binaryFilePath?: string, binaryFileName?: string) => {
      updateActiveRequest((prev) => ({ ...prev, binaryFilePath, binaryFileName }));
    },
    [updateActiveRequest]
  );

  const handleTestScriptChange = useCallback(
    (testScript: string) => {
      updateActiveRequest((prev) => ({ ...prev, testScript }));
    },
    [updateActiveRequest]
  );

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
        setConfigSubTab('body');
      } else if (parsed.auth && parsed.auth.type !== 'none') {
        setConfigSubTab('auth');
      } else if (parsed.headers.length > 0) {
        setConfigSubTab('headers');
      } else if (parsed.params.length > 0) {
        setConfigSubTab('params');
      }

      const cleanPath = parsed.url.replace(/^https?:\/\//, '').split('?')[0];
      const summaryDetails = [
        parsed.headers.length > 0
          ? `${parsed.headers.length} header${parsed.headers.length > 1 ? 's' : ''}`
          : null,
        parsed.params.length > 0
          ? `${parsed.params.length} param${parsed.params.length > 1 ? 's' : ''}`
          : null,
        parsed.auth && parsed.auth.type !== 'none' ? `${parsed.auth.type} auth` : null,
        parsed.bodyType !== 'none' ? `body (${parsed.bodyType})` : null,
      ]
        .filter(Boolean)
        .join(', ');

      showToast({
        type: 'success',
        title: `cURL imported: ${parsed.method} ${cleanPath.slice(0, 35) || 'request'}`,
        message: summaryDetails || 'All request components populated successfully',
      });
    },
    [updateActiveRequest, showToast]
  );

  const handleSendRequest = useCallback(async () => {
    if (!activeTab || activeTab.isLoading) return;
    if (!activeTab.request.url.trim()) return;

    const targetTabId = activeTabId;
    const requestSnapshot = activeTab.request;

    setTabs((prev) =>
      prev.map((t) => (t.id === targetTabId ? { ...t, isLoading: true } : t))
    );

    const { response, interpolatedRequest, finalUrl } = await executePreparedRequest(
      requestSnapshot,
      activeEnvironment,
      environments,
      onSetEnvVarFromScript
    );

    setTabs((prev) =>
      prev.map((t) => (t.id === targetTabId ? { ...t, response, isLoading: false } : t))
    );

    onAddHistoryEntry({
      id: generateId(),
      timestamp: Date.now(),
      method: interpolatedRequest.method,
      url: finalUrl,
      status: response.status,
      timeMs: response.timeMs,
      request: { ...requestSnapshot },
      responseSummary: {
        sizeBytes: response.sizeBytes,
        statusText: response.statusText,
      },
    });
  }, [
    activeTab,
    activeTabId,
    activeEnvironment,
    environments,
    onSetEnvVarFromScript,
    onAddHistoryEntry,
  ]);

  const handleCancelRequest = useCallback(() => {
    if (activeTab) {
      cancelHttpRequest(activeTab.request.id);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t))
    );
  }, [activeTab, activeTabId]);

  const handleNewTab = useCallback((protocol: RequestProtocol = 'http', customReq?: HttpRequest) => {
    const newId = `tab-${Date.now()}`;
    const initialReq = customReq || {
      ...DEFAULT_REQUEST,
      id: `req-${Date.now()}`,
      url: '{{baseUrl}}/posts',
    };
    const newTab: TabItem = {
      id: newId,
      title:
        protocol === 'websocket'
          ? 'WebSocket Echo'
          : `${initialReq.method} ${initialReq.name || 'New Request'}`,
      protocol,
      request: initialReq,
      response: null,
      isLoading: false,
      isDirty: false,
      wsUrl: DEFAULT_WS_URL,
      wsStatus: 'disconnected',
      wsMessages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  }, []);

  const handleCloseTab = useCallback(
    (idToClose: string) => {
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
    },
    [tabs, activeTabId]
  );

  const handleSelectRequest = useCallback(
    (req: HttpRequest, collectionId?: string, itemId?: string) => {
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
    },
    [activeTab, activeTabId, handleNewTab]
  );

  const handleReplayMockLog = useCallback(
    (log: ServerLogEntry, port: number) => {
      const newReq = serverLogToHttpRequest(log, port);
      handleNewTab('http', newReq);
      showToast({
        type: 'success',
        title: 'Opened in Client',
        message: `Opened ${log.method} ${log.path} in a new request tab`,
      });
    },
    [handleNewTab, showToast]
  );

  // WebSocket Helpers
  const appendWsMessage = useCallback(
    (
      tabId: string,
      message: Omit<WebSocketMessage, 'id' | 'timestamp'>,
      status?: WebSocketStatus,
      wsUrl?: string
    ) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                ...(status ? { wsStatus: status } : {}),
                ...(wsUrl !== undefined ? { wsUrl } : {}),
                wsMessages: [
                  ...(t.wsMessages || []),
                  {
                    id: generateId(),
                    timestamp: Date.now(),
                    ...message,
                  },
                ],
              }
            : t
        )
      );
    },
    []
  );

  const handleWsUrlChange = useCallback(
    (url: string) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, wsUrl: url } : t)));
    },
    [activeTabId]
  );

  const handleWsConnect = useCallback(
    (url: string) => {
      const tabId = activeTabId;
      const existing = wsConnectionsRef.current.get(tabId);
      if (existing) {
        existing.close();
      }

      appendWsMessage(tabId, { type: 'system', data: `Connecting to ${url}...`, sizeBytes: 0 }, 'connecting', url);

      try {
        const ws = new WebSocket(url);
        wsConnectionsRef.current.set(tabId, ws);

        ws.onopen = () => {
          appendWsMessage(tabId, { type: 'system', data: `Connected to ${url}`, sizeBytes: 0 }, 'connected');
        };

        ws.onmessage = (event) => {
          const dataStr = typeof event.data === 'string' ? event.data : '[Binary Frame]';
          appendWsMessage(tabId, {
            type: 'received',
            data: dataStr,
            sizeBytes: new Blob([dataStr]).size,
          });
        };

        ws.onerror = () => {
          appendWsMessage(tabId, { type: 'system', data: 'WebSocket error occurred', sizeBytes: 0 }, 'error');
        };

        ws.onclose = () => {
          appendWsMessage(tabId, { type: 'system', data: 'Connection closed', sizeBytes: 0 }, 'disconnected');
          wsConnectionsRef.current.delete(tabId);
        };
      } catch (err: any) {
        appendWsMessage(
          tabId,
          { type: 'system', data: `Failed to connect: ${err.message}`, sizeBytes: 0 },
          'error'
        );
      }
    },
    [activeTabId, appendWsMessage]
  );

  const handleWsDisconnect = useCallback(() => {
    const ws = wsConnectionsRef.current.get(activeTabId);
    if (ws) {
      ws.close();
      wsConnectionsRef.current.delete(activeTabId);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, wsStatus: 'disconnected' } : t))
    );
  }, [activeTabId]);

  const handleWsSendMessage = useCallback(
    (text: string) => {
      const ws = wsConnectionsRef.current.get(activeTabId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(text);
        appendWsMessage(activeTabId, {
          type: 'sent',
          data: text,
          sizeBytes: new Blob([text]).size,
        });
      }
    },
    [activeTabId, appendWsMessage]
  );

  const handleWsClearMessages = useCallback(() => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, wsMessages: [] } : t)));
  }, [activeTabId]);

  return {
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
  };
}
