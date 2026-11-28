import { Environment, HttpRequest, HttpResponse } from '../types';
import { applyAuthToHeadersAndParams } from '../utils/auth';
import { keyValuesToRecord, syncUrlWithParams } from '../utils/http';
import { runTestScript } from '../utils/testRunner';
import { interpolateRequest } from '../utils/variables';

export interface ExecutedRequestResult {
  response: HttpResponse;
  interpolatedRequest: HttpRequest;
  finalUrl: string;
}

function formatRequestError(err: any): HttpResponse {
  const causeText = err?.cause
    ? typeof err.cause === 'object'
      ? err.cause.code || err.cause.message || JSON.stringify(err.cause)
      : String(err.cause)
    : '';
  const detailedError = causeText
    ? `${err?.message || 'Request failed'}: ${causeText}`
    : err?.message || 'Unknown network error';

  return {
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

async function executeViaBrowserFetch(
  req: HttpRequest,
  finalUrl: string,
  headers: Record<string, string>
): Promise<HttpResponse> {
  const startTime = performance.now();
  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    (req.bodyType === 'json' || req.bodyType === 'text')
  ) {
    init.body = req.bodyContent;
  }

  const res = await fetch(finalUrl, init);
  const endTime = performance.now();
  const text = await res.text();
  const headersObj: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  let isJson = false;
  let data: any = text;
  try {
    data = JSON.parse(text);
    isJson = true;
  } catch {
    // Not JSON
  }

  return {
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

/**
 * Interpolates variables, applies authentication, executes the HTTP request
 * via Electron IPC (or browser fetch fallback), and runs any attached test script.
 */
export async function executePreparedRequest(
  request: HttpRequest,
  activeEnvironment?: Environment,
  environments?: Environment[],
  onSetEnvVar?: (key: string, value: string) => void
): Promise<ExecutedRequestResult> {
  const interpolatedRequest = interpolateRequest(request, activeEnvironment);

  const { headers: effectiveHeadersList, params: effectiveParamsList } =
    applyAuthToHeadersAndParams(
      interpolatedRequest.auth,
      interpolatedRequest.headers,
      interpolatedRequest.params
    );

  const finalUrl = syncUrlWithParams(interpolatedRequest.url, effectiveParamsList);
  const reqHeaders = keyValuesToRecord(effectiveHeadersList);

  let response: HttpResponse;

  try {
    if (window.interceptor?.sendRequest) {
      response = await window.interceptor.sendRequest({
        id: interpolatedRequest.id,
        method: interpolatedRequest.method,
        url: finalUrl,
        headers: reqHeaders,
        bodyType: interpolatedRequest.bodyType,
        body:
          interpolatedRequest.bodyType === 'json' || interpolatedRequest.bodyType === 'text'
            ? interpolatedRequest.bodyContent
            : undefined,
        formData: interpolatedRequest.formData,
        urlEncoded: interpolatedRequest.urlEncoded,
        binaryFilePath: interpolatedRequest.binaryFilePath,
      });
    } else {
      response = await executeViaBrowserFetch(interpolatedRequest, finalUrl, reqHeaders);
    }
  } catch (err) {
    response = formatRequestError(err);
  }

  if (request.testScript && request.testScript.trim()) {
    response.testResults = runTestScript(
      request.testScript,
      response,
      onSetEnvVar,
      activeEnvironment,
      environments
    );
  }

  return {
    response,
    interpolatedRequest,
    finalUrl,
  };
}

export function cancelHttpRequest(requestId: string): void {
  window.interceptor?.cancelRequest?.(requestId);
}
