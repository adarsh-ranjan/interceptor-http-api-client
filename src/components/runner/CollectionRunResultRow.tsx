import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { TestResult } from '../../types';

export interface RunResultItem {
  id: string;
  name: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timeMs: number;
  testResults: TestResult[];
  error?: string;
}

interface CollectionRunResultRowProps {
  result: RunResultItem;
  getMethodBadgeClass: (method: string) => string;
}

export const CollectionRunResultRow: React.FC<CollectionRunResultRowProps> = ({
  result,
  getMethodBadgeClass,
}) => {
  const hasFailedTests = result.testResults.some((t) => !t.passed);
  const isSuccess = result.status >= 200 && result.status < 400 && !hasFailedTests;

  return (
    <div
      className={`p-3 rounded-md border ${
        isSuccess ? 'bg-[#222224] border-[#333333]' : 'bg-rose-500/5 border-rose-500/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${getMethodBadgeClass(
              result.method
            )}`}
          >
            {result.method}
          </span>
          <span className="font-medium text-[#cccccc]">{result.name}</span>
          <span className="text-[#888888] font-mono text-[10px] truncate max-w-sm">
            {result.url}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span
            className={
              result.status >= 200 && result.status < 400
                ? 'text-emerald-400'
                : 'text-rose-400'
            }
          >
            {result.status} {result.statusText}
          </span>
          <span className="text-[#888888]">{result.timeMs} ms</span>
        </div>
      </div>

      {/* Test assertions for this request */}
      {result.testResults.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#333333] space-y-1">
          {result.testResults.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
              {t.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className={t.passed ? 'text-[#cccccc]' : 'text-rose-400 font-medium'}>
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
};
