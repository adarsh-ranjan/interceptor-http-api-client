export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'OPTIONS'
  | 'HEAD'
  | 'TRACE'
  | 'CONNECT'
  | (string & {});

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
}

export type BodyType = 'none' | 'json' | 'text' | 'form-data' | 'urlencoded' | 'binary';

export interface FormDataItem {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  filePath?: string;
  fileName?: string;
  enabled: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

export interface HttpRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  auth?: AuthConfig;
  bodyType: BodyType;
  bodyContent: string;
  formData?: FormDataItem[];
  urlEncoded?: KeyValuePair[];
  binaryFilePath?: string;
  binaryFileName?: string;
  testScript?: string;
  collectionId?: string;
  itemId?: string;
}

export interface HttpResponse {
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
  testResults?: TestResult[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  status: number;
  timeMs: number;
  request: HttpRequest;
  responseSummary?: {
    sizeBytes: number;
    statusText: string;
  };
}

export interface CollectionItem {
  id: string;
  name: string;
  type: 'folder' | 'request';
  request?: HttpRequest;
  children?: CollectionItem[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  items: CollectionItem[];
  createdAt: number;
  updatedAt: number;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isGlobal?: boolean;
}

export type RequestProtocol = 'http' | 'websocket';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketMessage {
  id: string;
  timestamp: number;
  type: 'sent' | 'received' | 'system';
  data: string;
  sizeBytes: number;
}

export interface TabItem {
  id: string;
  title: string;
  protocol: RequestProtocol;
  request: HttpRequest;
  response: HttpResponse | null;
  isLoading: boolean;
  isDirty?: boolean;
  // WebSocket specific fields
  wsUrl?: string;
  wsStatus?: WebSocketStatus;
  wsMessages?: WebSocketMessage[];
}

export interface CollectionRunItemResult {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  status: number;
  statusText: string;
  timeMs: number;
  testResults: TestResult[];
  error?: string;
}

export interface CollectionRunReport {
  collectionId: string;
  collectionName: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  passedCount: number;
  failedCount: number;
  results: CollectionRunItemResult[];
}

export interface FileDialogResult {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  content?: string;
}

declare global {
  interface Window {
    interceptor?: {
      platform: string;
      isMaximized?: () => Promise<boolean>;
      onWindowStateChange?: (callback: (isMaximized: boolean) => void) => () => void;
      sendRequest: (options: {
        id?: string;
        method: string;
        url: string;
        headers: Record<string, string>;
        bodyType?: BodyType;
        body?: string;
        formData?: FormDataItem[];
        urlEncoded?: KeyValuePair[];
        binaryFilePath?: string;
        timeout?: number;
      }) => Promise<HttpResponse>;
      cancelRequest: (requestId: string) => void;
      openFileDialog: (options?: {
        title?: string;
        filters?: { name: string; extensions: string[] }[];
        readContent?: boolean;
      }) => Promise<FileDialogResult>;
      saveFileDialog: (options: {
        defaultPath?: string;
        content: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
      mockServer?: {
        startServer: (server: import('./server').MockServer) => Promise<{ success: boolean; error?: string }>;
        stopServer: (serverId: string) => Promise<{ success: boolean; error?: string }>;
        stopAllServers: () => Promise<{ success: boolean }>;
        getStore?: (serverId: string) => Promise<Record<string, any>>;
        clearStore?: (serverId: string) => Promise<boolean>;
        setStore?: (serverId: string, data: Record<string, any>) => Promise<boolean>;
        onServerLog: (callback: (log: import('./server').ServerLogEntry) => void) => () => void;
        onServerStatusChange: (callback: (data: { serverId: string; status: import('./server').ServerStatus; error?: string }) => void) => () => void;
      };
    };
  }
}

export * from './server';

