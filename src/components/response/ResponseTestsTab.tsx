import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

interface ResponseTestsTabProps {
  testResults: TestResult[];
}

export const ResponseTestsTab: React.FC<ResponseTestsTabProps> = ({ testResults }) => {
  const passedTestsCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
          <span className="font-semibold text-[#cccccc]">Assertion Breakdown</span>
          <span className="text-[#888888]">
            {passedTestsCount} passed, {testResults.length - passedTestsCount} failed
          </span>
        </div>

        {testResults.map((result) => (
          <div
            key={result.id}
            className={`p-2.5 rounded-md border flex items-start gap-2.5 ${
              result.passed
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200">{result.name}</p>
              {result.error && (
                <p className="text-[11px] font-mono text-rose-400 mt-1 whitespace-pre-wrap">
                  {result.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
