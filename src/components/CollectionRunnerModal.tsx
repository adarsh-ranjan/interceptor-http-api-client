import React from 'react';
import { Collection, Environment } from '../types';
import { formatDuration, getMethodBadgeClass } from '../utils/http';
import { useCollectionRunner } from '../hooks/useCollectionRunner';
import { CheckCircle2, Layers, Play, RotateCcw, XCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';

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
  const {
    selectedEnvId,
    setSelectedEnvId,
    delayMs,
    setDelayMs,
    isRunning,
    currentProgress,
    runReport,
    allRequests,
    startRun,
  } = useCollectionRunner({ collection, environments, activeEnvId });

  if (!isOpen || !collection) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Collection Runner: ${collection.name}`}
      icon={<Layers className="w-4 h-4 text-[#d99b26]" />}
      containerClassName="w-full max-w-3xl h-[600px]"
    >
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
              onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
              disabled={isRunning}
              className="w-16 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-[#cccccc] font-mono focus:outline-none focus:border-[#444444]"
            />
            <span className="text-[#666666] font-mono">ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {runReport ? (
            <button
              onClick={startRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d99b26] hover:bg-[#c2871a] text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Run Again</span>
            </button>
          ) : (
            <button
              onClick={startRun}
              disabled={isRunning || allRequests.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run {allRequests.length} Requests</span>
            </button>
          )}
        </div>
      </div>

      {isRunning && currentProgress && (
        <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#333333]">
          <div className="flex items-center justify-between mb-1.5 text-[#cccccc]">
            <span className="font-medium">
              Running ({currentProgress.current}/{currentProgress.total}):{' '}
              {currentProgress.requestName}
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

      <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
        {runReport ? (
          <div className="space-y-4">
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

            <div className="space-y-2">
              <span className="font-semibold text-[#cccccc] uppercase tracking-wider text-[11px]">
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
                        ? 'bg-[#222224] border-[#333333]'
                        : 'bg-rose-500/5 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${getMethodBadgeClass(
                            res.method
                          )}`}
                        >
                          {res.method}
                        </span>
                        <span className="font-medium text-[#cccccc]">{res.name}</span>
                        <span className="text-[#888888] font-mono text-[10px] truncate max-w-sm">
                          {res.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span
                          className={
                            res.status >= 200 && res.status < 400
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {res.status} {res.statusText}
                        </span>
                        <span className="text-[#888888]">{res.timeMs} ms</span>
                      </div>
                    </div>

                    {res.testResults.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#333333] space-y-1">
                        {res.testResults.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                            {t.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span
                              className={t.passed ? 'text-[#cccccc]' : 'text-rose-400 font-medium'}
                            >
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
                    <span className="text-[#666666] font-mono text-[10px] w-5">{idx + 1}.</span>
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
    </ModalShell>
  );
};
