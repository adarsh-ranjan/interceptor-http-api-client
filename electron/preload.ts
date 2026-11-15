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
};

contextBridge.exposeInMainWorld('interceptor', api);

export type InterceptorApi = typeof api;
