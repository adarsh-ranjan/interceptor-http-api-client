import React, { useState } from 'react';
import {
  Collection,
  CollectionItem,
  Environment,
  HttpRequest,
  CollectionRunItemResult,
  CollectionRunReport,
} from '../types';
import { interpolateRequest } from '../utils/variables';
import { applyAuthToHeadersAndParams } from '../utils/auth';
import { syncUrlWithParams, keyValuesToRecord, formatDuration } from '../utils/http';
import { runTestScript } from '../utils/testRunner';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';

interface CollectionRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection | null;
  environments: Environment[];
  activeEnvId: string | null;
}

export const CollectionRunnerModal: React.FC<CollectionRunnerModalProps> = ({
  isOpen,
  onClose,
  collection,
  environments,
  activeEnvId,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(activeEnvId);
  const [delayMs, setDelayMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; requestName: string } | null>(null);
  const [runReport, setRunReport] = useState<CollectionRunReport | null>(null);

  if (!isOpen || !collection) return null;

  // Recursively collect all requests in collection
  const flattenRequests = (items: CollectionItem[]): { name: string; request: HttpRequest }[] => {
    let result: { name: string; request: HttpRequest }[] = [];
    for (const item of items) {
      if (item.type === 'request' && item.request) {
        result.push({ name: item.name, request: item.request });
      } else if (item.type === 'folder' && item.children) {
        result = [...result, ...flattenRequests(item.children)];
      }
    }
    return result;
  };

  const allRequests = flattenRequests(collection.items);
  const activeEnv = environments.find((e) => e.id === selectedEnvId);

  const handleStartRun = async () => {
    if (allRequests.length === 0 || isRunning) return;

    setIsRunning(true);
    setRunReport(null);
    const startTime = performance.now();
    const itemResults: CollectionRunItemResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < allRequests.length; i++) {
      const { name, request } = allRequests[i];
      setCurrentProgress({
        current: i + 1,
        total: allRequests.length,
        requestName: name,
      });

      if (delayMs > 0 && i > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // 1. Resolve variables
      const interpolatedReq = interpolateRequest(request, activeEnv);

      // 2. Apply auth
      const { headers: effectiveHeadersList, params: effectiveParamsList } =
        applyAuthToHeadersAndParams(
          interpolatedReq.auth,
          interpolatedReq.headers,
          interpolatedReq.params
        );

      const finalUrl = syncUrlWithParams(interpolatedReq.url, effectiveParamsList);
      const reqHeaders = keyValuesToRecord(effectiveHeadersList);

      try {
        let resData: any;
        if (window.interceptor?.sendRequest) {
          resData = await window.interceptor.sendRequest({
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
          // Browser fetch fallback
          const t0 = performance.now();
          const init: RequestInit = {
            method: interpolatedReq.method,
            headers: reqHeaders,
          };
          if (
            ['POST', 'PUT', 'PATCH', 'DELETE'].includes(interpolatedReq.method) &&
            (interpolatedReq.bodyType === 'json' || interpolatedReq.bodyType === 'text')
          ) {
            init.body = interpolatedReq.bodyContent;
          }
          const res = await fetch(finalUrl, init);
          const t1 = performance.now();
          const raw = await res.text();
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            // not json
          }
          resData = {
            status: res.status,
            statusText: res.statusText,
            headers: {},
            data,
            rawBody: raw,
            contentType: res.headers.get('content-type') || '',
            isJson: true,
            timeMs: Math.round(t1 - t0),
            sizeBytes: new Blob([raw]).size,
          };
        }

        // Run assertions
        const testResults = interpolatedReq.testScript
          ? runTestScript(interpolatedReq.testScript, resData, undefined, activeEnv, environments)
          : [];

        const testPassed = testResults.filter((t) => t.passed).length;
        const testFailed = testResults.filter((t) => !t.passed).length;
        passedCount += testPassed;
        failedCount += testFailed;

        itemResults.push({
          id: Math.random().toString(36).substring(2, 9),
          name,
          method: interpolatedReq.method,
          url: finalUrl,
          status: resData.status,
          statusText: resData.statusText,
          timeMs: resData.timeMs,
          testResults,
        });
      } catch (err: any) {
        failedCount += 1;
        itemResults.push({
          id: Math.random().toString(36).substring(2, 9),
          name,
          method: interpolatedReq.method,
          url: finalUrl,
          status: 0,
          statusText: 'Error',
          timeMs: 0,
          testResults: [],
          error: err.message,
        });
      }
    }

    const endTime = performance.now();
    setIsRunning(false);
    setCurrentProgress(null);

    setRunReport({
      collectionId: collection.id,
      collectionName: collection.name,
      startTime,
      endTime,
      totalRequests: allRequests.length,
      passedCount,
      failedCount,
      results: itemResults,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl h-[600px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Collection Runner: {collection.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-3 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-400 font-medium">Environment:</label>
              <select
                value={selectedEnvId || ''}
                onChange={(e) => setSelectedEnvId(e.target.value || null)}
                disabled={isRunning}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">No Environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-slate-400 font-medium">Delay:</label>
              <input
                type="number"
                min="0"
                step="50"
                value={delayMs}
                onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={isRunning}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-500 font-mono">ms</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {runReport ? (
              <button
                onClick={handleStartRun}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium shadow-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Again</span>
              </button>
            ) : (
              <button
                onClick={handleStartRun}
                disabled={isRunning || allRequests.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run {allRequests.length} Requests</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Indicator */}
        {isRunning && currentProgress && (
          <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d]">
            <div className="flex items-center justify-between mb-1.5 text-slate-300">
              <span className="font-medium">
                Running ({currentProgress.current}/{currentProgress.total}): {currentProgress.requestName}
              </span>
              <span className="font-mono text-slate-500">
                {Math.round((currentProgress.current / currentProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#161b22] h-2 rounded-full overflow-hidden border border-[#30363d]/50">
              <div
                className="bg-sky-500 h-full transition-all duration-200"
                style={{
                  width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Report / Queue View */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0d1117]">
          {runReport ? (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Requests</p>
                  <p className="text-xl font-bold text-slate-100 font-mono mt-0.5">
                    {runReport.totalRequests}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Passed Tests</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {runReport.passedCount}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Failed Tests</p>
                  <p className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                    {runReport.failedCount}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Duration</p>
                  <p className="text-xl font-bold text-sky-400 font-mono mt-0.5">
                    {formatDuration(Math.round(runReport.endTime - runReport.startTime))}
                  </p>
                </div>
              </div>

              {/* Detailed Results List */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Execution Log
                </span>
                {runReport.results.map((res) => {
                  const hasFailedTests = res.testResults.some((t) => !t.passed);
                  const isSuccess = res.status >= 200 && res.status < 400 && !hasFailedTests;

                  return (
                    <div
                      key={res.id}
                      className={`p-3 rounded-md border ${
                        isSuccess
                          ? 'bg-[#161b22] border-[#30363d]'
                          : 'bg-rose-500/5 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            {res.method}
                          </span>
                          <span className="font-medium text-slate-200">{res.name}</span>
                          <span className="text-slate-500 font-mono text-[10px] truncate max-w-sm">
                            {res.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className={res.status >= 200 && res.status < 400 ? 'text-emerald-400' : 'text-rose-400'}>
                            {res.status} {res.statusText}
                          </span>
                          <span className="text-slate-500">{res.timeMs} ms</span>
                        </div>
                      </div>

                      {/* Test assertions for this request */}
                      {res.testResults.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#30363d]/50 space-y-1">
                          {res.testResults.map((t) => (
                            <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                              {t.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className={t.passed ? 'text-slate-300' : 'text-rose-400 font-medium'}>
                                {t.name}
                              </span>
                              {t.error && (
                                <span className="text-rose-500 font-mono text-[10px] ml-1">
                                  — {t.error}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                Requests to Execute ({allRequests.length})
              </span>
              <div className="space-y-1.5">
                {allRequests.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-[#161b22] border border-[#30363d]/60 text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[10px] w-5">
                        {idx + 1}.
                      </span>
                      <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        {item.request.method}
                      </span>
                      <span className="font-medium text-xs text-slate-200">{item.name}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[10px] truncate max-w-xs">
                      {item.request.url}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
