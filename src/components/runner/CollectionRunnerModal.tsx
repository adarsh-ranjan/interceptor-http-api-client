import React, { useState } from 'react';
import {
  Collection,
  CollectionItem,
  Environment,
  HttpRequest,
  CollectionRunItemResult,
  CollectionRunReport,
} from '../../types';
import { interpolateRequest } from '../../utils/variables';
import { applyAuthToHeadersAndParams } from '../../utils/auth';
import {
  syncUrlWithParams,
  keyValuesToRecord,
  formatDuration,
  getMethodBadgeClass,
} from '../../utils/http';
import { runTestScript } from '../../utils/testRunner';
import { CollectionRunResultRow } from './CollectionRunResultRow';
import { Layers, X, Play, RotateCcw } from 'lucide-react';

export interface CollectionRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection | null;
  environments?: Environment[];
  activeEnvId?: string | null;
}

export const CollectionRunnerModal: React.FC<CollectionRunnerModalProps> = ({
  isOpen,
  onClose,
  collection,
  environments = [],
  activeEnvId,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(activeEnvId || null);
  const [delayMs, setDelayMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{
    current: number;
    total: number;
    requestName: string;
  } | null>(null);
  const [runReport, setRunReport] = useState<CollectionRunReport | null>(null);

  if (!isOpen || !collection) return null;

  // Recursively collect all requests in collection
  const flattenRequests = (
    items: CollectionItem[]
  ): { name: string; request: HttpRequest }[] => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-3xl h-[600px] bg-[#222224] border border-[#333333] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-[#cccccc] font-semibold text-sm">
            <Layers className="w-4 h-4 text-[#d99b26]" />
            <span>Collection Runner: {collection.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-3 border-b border-[#333333] bg-[#222224] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <label className="text-[#888888] font-medium">Environment:</label>
              <select
                value={selectedEnvId || ''}
                onChange={(e) => setSelectedEnvId(e.target.value || null)}
                disabled={isRunning}
                className="bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1 text-[#cccccc] focus:outline-none focus:border-[#444444] cursor-pointer"
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
              <label className="text-[#888888] font-medium">Delay:</label>
              <input
                type="number"
                min="0"
                step="50"
                value={delayMs}
                onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value, 10) || 0))}
                disabled={isRunning}
                className="w-16 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-[#cccccc] font-mono focus:outline-none focus:border-[#444444]"
              />
              <span className="text-[#666666] font-mono">ms</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {runReport ? (
              <button
                onClick={handleStartRun}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d99b26] hover:bg-[#c2871a] text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Again</span>
              </button>
            ) : (
              <button
                onClick={handleStartRun}
                disabled={isRunning || allRequests.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run {allRequests.length} Requests</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Indicator */}
        {isRunning && currentProgress && (
          <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#333333]">
            <div className="flex items-center justify-between mb-1.5 text-[#cccccc]">
              <span className="font-medium">
                Running ({currentProgress.current}/{currentProgress.total}): {currentProgress.requestName}
              </span>
              <span className="font-mono text-[#888888]">
                {Math.round((currentProgress.current / currentProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#222224] h-2 rounded-full overflow-hidden border border-[#333333]">
              <div
                className="bg-[#d99b26] h-full transition-all duration-200"
                style={{
                  width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Report / Queue View */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
          {runReport ? (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-[#222224] border border-[#333333]">
                  <p className="text-[10px] text-[#888888] uppercase font-semibold">Total Requests</p>
                  <p className="text-xl font-bold text-[#cccccc] font-mono mt-0.5">
                    {runReport.totalRequests}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#222224] border border-[#333333]">
                  <p className="text-[10px] text-[#888888] uppercase font-semibold">Passed Tests</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {runReport.passedCount}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#222224] border border-[#333333]">
                  <p className="text-[10px] text-[#888888] uppercase font-semibold">Failed Tests</p>
                  <p className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                    {runReport.failedCount}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-[#222224] border border-[#333333]">
                  <p className="text-[10px] text-[#888888] uppercase font-semibold">Total Duration</p>
                  <p className="text-xl font-bold text-[#d99b26] font-mono mt-0.5">
                    {formatDuration(Math.round(runReport.endTime - runReport.startTime))}
                  </p>
                </div>
              </div>

              {/* Detailed Results List */}
              <div className="space-y-2">
                <span className="font-semibold text-[#cccccc] uppercase tracking-wider text-[11px]">
                  Execution Log
                </span>
                {runReport.results.map((res) => (
                  <CollectionRunResultRow
                    key={res.id}
                    result={res}
                    getMethodBadgeClass={getMethodBadgeClass}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="font-semibold text-[#888888] uppercase tracking-wider text-[11px]">
                Requests to Execute ({allRequests.length})
              </span>
              <div className="space-y-1.5">
                {allRequests.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-[#222224] border border-[#333333] text-[#cccccc]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#666666] font-mono text-[10px] w-5">
                        {idx + 1}.
                      </span>
                      <span
                        className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${getMethodBadgeClass(
                          item.request.method
                        )}`}
                      >
                        {item.request.method}
                      </span>
                      <span className="font-medium text-xs text-[#cccccc]">{item.name}</span>
                    </div>
                    <span className="text-[#888888] font-mono text-[10px] truncate max-w-xs">
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
