import { contextBridge, ipcRenderer } from 'electron';

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

const api = {
  platform: process.platform,
  isMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:isMaximized');
  },
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: any, state: { isMaximized: boolean }) => {
      callback(state.isMaximized);
    };
    ipcRenderer.on('window:state-changed', handler);
    return () => {
      ipcRenderer.removeListener('window:state-changed', handler);
    };
  },
  sendRequest: (options: HttpRequestOptions): Promise<HttpResponseData> => {
    return ipcRenderer.invoke('http:execute', options);
  },
  cancelRequest: (requestId: string) => {
    ipcRenderer.send('http:cancel', requestId);
  },
  openFileDialog: (options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    readContent?: boolean;
  }): Promise<FileDialogResult> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  saveFileDialog: (options: {
    defaultPath?: string;
    content: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<boolean> => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },
  mockServer: {
    startServer: (server: any): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('mock-server:start', server);
    },
    stopServer: (serverId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('mock-server:stop', serverId);
    },
    stopAllServers: (): Promise<{ success: boolean }> => {
      return ipcRenderer.invoke('mock-server:stop-all');
    },
    getStore: (serverId: string): Promise<Record<string, any>> => {
      return ipcRenderer.invoke('mock-server:get-store', serverId);
    },
    clearStore: (serverId: string): Promise<boolean> => {
      return ipcRenderer.invoke('mock-server:clear-store', serverId);
    },
    setStore: (serverId: string, data: Record<string, any>): Promise<boolean> => {
      return ipcRenderer.invoke('mock-server:set-store', serverId, data);
    },
    onServerLog: (callback: (log: any) => void) => {
      const handler = (_event: any, log: any) => {
        callback(log);
      };
      ipcRenderer.on('mock-server:request-log', handler);
      return () => {
        ipcRenderer.removeListener('mock-server:request-log', handler);
      };
    },
    onServerStatusChange: (callback: (data: { serverId: string; status: any; error?: string }) => void) => {
      const handler = (_event: any, data: any) => {
        callback(data);
      };
      ipcRenderer.on('mock-server:status-change', handler);
      return () => {
        ipcRenderer.removeListener('mock-server:status-change', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('interceptor', api);

export type InterceptorApi = typeof api;
