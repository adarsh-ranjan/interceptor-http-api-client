import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

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
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.length - passedCount;

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-semibold text-foreground text-xs">
            Assertion Breakdown
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/10 text-[10px]">
              {passedCount} passed
            </Badge>
            {failedCount > 0 && (
              <Badge variant="outline" className="text-rose-400 border-rose-500/20 bg-rose-500/10 text-[10px]">
                {failedCount} failed
              </Badge>
            )}
          </div>
        </div>

        {testResults.map((result) => (
          <div
            key={result.id}
            className={`p-2.5 rounded-md border flex items-start gap-2.5 transition-colors ${
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
              <p className="font-medium text-foreground text-xs">{result.name}</p>
              {result.error && (
                <p className="text-[11px] font-mono text-rose-400 mt-1 whitespace-pre-wrap">
                  {result.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
