import fs from 'fs';
import path from 'path';

export interface HttpExecuteOptions {
  id?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  bodyType?: string;
  body?: string;
  formData?: Array<{
    enabled?: boolean;
    key?: string;
    value?: string;
    type?: string;
    filePath?: string;
    fileName?: string;
  }>;
  urlEncoded?: Array<{
    enabled?: boolean;
    key?: string;
    value?: string;
  }>;
  binaryFilePath?: string;
  timeout?: number;
}

export interface HttpExecuteResult {
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

function parseTargetUrl(rawUrl: string): URL {
  const cleanUrl = (rawUrl || '').trim();
  const normalized =
    cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `http://${cleanUrl}`;
  try {
    return new URL(normalized);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
}

function buildFetchHeaders(headers: Record<string, string>): Headers {
  const fetchHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    const trimmedKey = key?.trim();
    if (trimmedKey && value !== undefined && value !== null) {
      try {
        fetchHeaders.append(trimmedKey, String(value));
      } catch {
        // Ignore headers with unsupported characters
      }
    }
  }
  return fetchHeaders;
}

async function applyRequestBody(
  options: HttpExecuteOptions,
  requestInit: RequestInit,
  fetchHeaders: Headers
): Promise<void> {
  const { method, bodyType = 'none', body, formData, urlEncoded, binaryFilePath } = options;
  const isBodyAllowed = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (!isBodyAllowed) return;

  if (bodyType === 'form-data' && Array.isArray(formData)) {
    const nativeFormData = new FormData();
    for (const item of formData) {
      if (!item.enabled || !item.key) continue;
      if (item.type === 'file' && item.filePath) {
        try {
          const fileBuffer = await fs.promises.readFile(item.filePath);
          const fileName = item.fileName || path.basename(item.filePath);
          nativeFormData.append(item.key, new Blob([fileBuffer]), fileName);
        } catch (err: any) {
          throw new Error(`Failed to read file for form-data: ${err.message}`);
        }
      } else {
        nativeFormData.append(item.key, item.value || '');
      }
    }
    requestInit.body = nativeFormData as any;
    fetchHeaders.delete('content-type');
  } else if (bodyType === 'urlencoded' && Array.isArray(urlEncoded)) {
    const searchParams = new URLSearchParams();
    for (const item of urlEncoded) {
      if (item.enabled && item.key) {
        searchParams.append(item.key, item.value || '');
      }
    }
    requestInit.body = searchParams.toString();
    if (!fetchHeaders.has('content-type')) {
      fetchHeaders.set('content-type', 'application/x-www-form-urlencoded');
    }
  } else if (bodyType === 'binary' && binaryFilePath) {
    try {
      requestInit.body = await fs.promises.readFile(binaryFilePath);
      if (!fetchHeaders.has('content-type')) {
        fetchHeaders.set('content-type', 'application/octet-stream');
      }
    } catch (err: any) {
      throw new Error(`Failed to read binary file: ${err.message}`);
    }
  } else if (body) {
    requestInit.body = body;
  }
}

async function fetchWithLocalhostFallback(parsedUrl: URL, requestInit: RequestInit): Promise<Response> {
  try {
    return await fetch(parsedUrl.toString(), requestInit);
  } catch (fetchErr: any) {
    // Node/undici resolves localhost to ::1 (IPv6); retry on 127.0.0.1 if server binds IPv4 only.
    if (parsedUrl.hostname === 'localhost') {
      try {
        const ipv4Url = new URL(parsedUrl.toString());
        ipv4Url.hostname = '127.0.0.1';
        return await fetch(ipv4Url.toString(), requestInit);
      } catch {
        throw fetchErr;
      }
    }
    throw fetchErr;
  }
}

function formatDetailedError(error: any, timeout: number): string {
  let causeInfo = '';
  if (error?.cause) {
    if (typeof error.cause === 'object') {
      const code = error.cause.code || '';
      const msg = error.cause.message || '';
      const address = error.cause.address ? ` at ${error.cause.address}:${error.cause.port}` : '';
      if (code && msg) {
        causeInfo = `${code}: ${msg}${address}`;
      } else if (code) {
        causeInfo = `${code}${address}`;
      } else if (msg) {
        causeInfo = msg;
      } else {
        causeInfo = JSON.stringify(error.cause);
      }
    } else {
      causeInfo = String(error.cause);
    }
  }

  if (error?.name === 'AbortError') {
    return `Request timed out or was aborted after ${timeout}ms`;
  }
  if (causeInfo.includes('ECONNREFUSED')) {
    return `Connection refused (${causeInfo}). Is the target server running on that port?`;
  }
  if (causeInfo.includes('ENOTFOUND')) {
    return `Host not found (${causeInfo}). DNS resolution failed — verify the hostname or internet connection.`;
  }
  if (causeInfo.includes('ETIMEDOUT') || causeInfo.includes('UND_ERR_CONNECT_TIMEOUT')) {
    return `Connection timed out (${causeInfo}).`;
  }
  if (causeInfo.includes('CERT') || causeInfo.includes('SELF_SIGNED')) {
    return `SSL Certificate Error (${causeInfo}).`;
  }
  if (causeInfo) {
    return `${error?.message || 'Request failed'}: ${causeInfo}`;
  }
  return error?.message || 'Request failed';
}

export class HttpExecutionService {
  private activeRequests = new Map<string, AbortController>();

  public async execute(options: HttpExecuteOptions): Promise<HttpExecuteResult> {
    const {
      id = Math.random().toString(36).substring(2),
      method,
      url,
      headers = {},
      timeout = 30000,
    } = options;

    const controller = new AbortController();
    this.activeRequests.set(id, controller);

    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);

    const startTime = performance.now();

    try {
      const parsedUrl = parseTargetUrl(url);
      const fetchHeaders = buildFetchHeaders(headers);

      const requestInit: RequestInit = {
        method: method.toUpperCase(),
        headers: fetchHeaders,
        signal: controller.signal,
        redirect: 'follow',
      };

      await applyRequestBody(options, requestInit, fetchHeaders);

      const response = await fetchWithLocalhostFallback(parsedUrl, requestInit);

      clearTimeout(timeoutId);
      this.activeRequests.delete(id);

      const timeMs = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const contentType = response.headers.get('content-type') || '';
      const arrayBuffer = await response.arrayBuffer();
      const sizeBytes = arrayBuffer.byteLength;
      const rawBody = new TextDecoder('utf-8').decode(arrayBuffer);

      let parsedData: any = rawBody;
      let isJson = false;

      if (
        contentType.includes('application/json') ||
        rawBody.trim().startsWith('{') ||
        rawBody.trim().startsWith('[')
      ) {
        try {
          parsedData = JSON.parse(rawBody);
          isJson = true;
        } catch {
          parsedData = rawBody;
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: parsedData,
        rawBody,
        contentType,
        isJson,
        timeMs,
        sizeBytes,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(id);
      const timeMs = Math.round(performance.now() - startTime);
      const detailedMessage = formatDetailedError(error, timeout);

      console.error(`[Interceptor HTTP Error] ${method} ${url}:`, detailedMessage, error);

      return {
        status: 0,
        statusText: error?.name === 'AbortError' ? 'Aborted' : 'Error',
        headers: {},
        data: null,
        rawBody: detailedMessage,
        contentType: 'text/plain',
        isJson: false,
        timeMs,
        sizeBytes: 0,
        error: detailedMessage,
      };
    }
  }

  public cancel(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort(new Error('Request cancelled by user'));
      this.activeRequests.delete(requestId);
    }
  }
}
