import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipcChannels';

export interface HttpRequestOptions {
  id?: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyType?: string;
  body?: string;
  formData?: any[];
  urlEncoded?: any[];
  binaryFilePath?: string;
  timeout?: number;
}

export interface HttpResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  rawBody: string;
  contentType: string;
  isJson: boolean;
  timeMs: number;
  sizeBytes: number;
  error?: string;
}

export interface FileDialogResult {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  content?: string;
}

function subscribeIpcChannel<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: any, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api = {
  platform: process.platform,
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onWindowStateChange: (callback: (isMaximized: boolean) => void) =>
    subscribeIpcChannel<{ isMaximized: boolean }>(IPC_CHANNELS.WINDOW_STATE_CHANGED, (state) =>
      callback(state.isMaximized)
    ),
  sendRequest: (options: HttpRequestOptions): Promise<HttpResponseData> =>
    ipcRenderer.invoke(IPC_CHANNELS.HTTP_EXECUTE, options),
  cancelRequest: (requestId: string) => ipcRenderer.send(IPC_CHANNELS.HTTP_CANCEL, requestId),
  openFileDialog: (options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    readContent?: boolean;
  }): Promise<FileDialogResult> => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
  saveFileDialog: (options: {
    defaultPath?: string;
    content: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
  mockServer: {
    startServer: (server: any): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_START, server),
    stopServer: (serverId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_STOP, serverId),
    stopAllServers: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_STOP_ALL),
    getStore: (serverId: string): Promise<Record<string, any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_GET_STORE, serverId),
    clearStore: (serverId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_CLEAR_STORE, serverId),
    setStore: (serverId: string, data: Record<string, any>): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.MOCK_SERVER_SET_STORE, serverId, data),
    onServerLog: (callback: (log: any) => void) =>
      subscribeIpcChannel<any>(IPC_CHANNELS.MOCK_SERVER_REQUEST_LOG, callback),
    onServerStatusChange: (
      callback: (data: { serverId: string; status: any; error?: string }) => void
    ) =>
      subscribeIpcChannel<{ serverId: string; status: any; error?: string }>(
        IPC_CHANNELS.MOCK_SERVER_STATUS_CHANGE,
        callback
      ),
  },
};

contextBridge.exposeInMainWorld('interceptor', api);

export type InterceptorApi = typeof api;
