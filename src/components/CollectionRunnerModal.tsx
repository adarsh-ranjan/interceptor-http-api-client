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
import { CollectionRunResultRow } from './runner/CollectionRunResultRow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
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
  const [currentProgress, setCurrentProgress] = useState<{
    current: number;
    total: number;
    requestName: string;
  } | null>(null);
  const [runReport, setRunReport] = useState<CollectionRunReport | null>(null);

  if (!collection) return null;

  // Flatten all requests in collection
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

      const interpolatedReq = interpolateRequest(request, activeEnv);
      const { headers: effectiveHeadersList, params: effectiveParamsList } =
        applyAuthToHeadersAndParams(
          interpolatedReq.auth,
          interpolatedReq.headers,
          interpolatedReq.params
        );

      const finalUrl = syncUrlWithParams(interpolatedReq.url, effectiveParamsList);
      const reqHeaders = keyValuesToRecord(effectiveHeadersList);

      try {
        const reqStart = performance.now();
        const response = await window.interceptor.sendRequest({
          url: finalUrl,
          method: interpolatedReq.method,
          headers: reqHeaders,
          body: interpolatedReq.body?.raw || '',
          timeout: 30000,
        });
        const reqTime = performance.now() - reqStart;

        let testResults: any[] = [];
        let reqPassed = response.status >= 200 && response.status < 400;

        if (interpolatedReq.testScript && interpolatedReq.testScript.trim()) {
          const testOutcome = runTestScript(interpolatedReq.testScript, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            timeMs: reqTime,
            sizeBytes: response.sizeBytes || 0,
            rawBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
            isJson: typeof response.data === 'object',
          });
          testResults = testOutcome.results;
          reqPassed = testOutcome.allPassed;
        }

        if (reqPassed) passedCount++;
        else failedCount++;

        itemResults.push({
          id: request.id,
          name,
          request: interpolatedReq,
          statusCode: response.status,
          timeMs: reqTime,
          sizeBytes: response.sizeBytes || 0,
          passed: reqPassed,
          testResults,
        });
      } catch (err: any) {
        failedCount++;
        itemResults.push({
          id: request.id,
          name,
          request: interpolatedReq,
          statusCode: 0,
          timeMs: 0,
          sizeBytes: 0,
          passed: false,
          testResults: [{ name: 'Request Error', passed: false, error: err.message || 'Network failure' }],
          error: err.message || 'Execution error',
        });
      }
    }

    const totalDuration = performance.now() - startTime;
    setIsRunning(false);
    setCurrentProgress(null);
    setRunReport({
      collectionId: collection.id,
      collectionName: collection.name,
      totalRequests: allRequests.length,
      passedRequests: passedCount,
      failedRequests: failedCount,
      totalDurationMs: totalDuration,
      results: itemResults,
      timestamp: Date.now(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
      <DialogContent className="max-w-2xl h-[580px] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-[#141517]">
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary fill-current" />
            <span>Collection Runner: {collection.name}</span>
          </DialogTitle>
          <DialogDescription>
            Execute batch API requests with sequential assertion validation.
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Row */}
        <div className="p-3 bg-[#1a1b1e] border-b border-border flex items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-muted-foreground font-medium shrink-0">Environment:</label>
            <Select
              value={selectedEnvId || 'none'}
              onValueChange={(val) => setSelectedEnvId(val === 'none' ? null : val)}
              disabled={isRunning}
            >
              <SelectTrigger className="w-44 h-7 text-xs bg-[#141517]">
                <SelectValue placeholder="No Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Environment</SelectItem>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-muted-foreground font-medium shrink-0">Delay (ms):</label>
            <Input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(Math.max(0, Number(e.target.value)))}
              disabled={isRunning}
              min={0}
              className="w-20 h-7 text-xs font-mono text-center bg-[#141517]"
            />
          </div>

          <Button
            variant="amber"
            size="sm"
            onClick={handleStartRun}
            disabled={isRunning || allRequests.length === 0}
            className="h-7 font-semibold"
          >
            {isRunning ? (
              <span>Running ({currentProgress?.current}/{currentProgress?.total})...</span>
            ) : runReport ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Run Again</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                <span>Start Run ({allRequests.length})</span>
              </>
            )}
          </Button>
        </div>

        {/* Live Progress Bar */}
        {isRunning && currentProgress && (
          <div className="p-3 bg-[#141517] border-b border-border space-y-1.5 select-none">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground truncate">
                Running: {currentProgress.requestName}
              </span>
              <span className="font-mono text-muted-foreground text-[11px]">
                {currentProgress.current} / {currentProgress.total}
              </span>
            </div>
            <div className="w-full bg-[#26282c] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{
                  width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Scorecard Summary */}
        {runReport && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-[#141517] border-b border-border text-center select-none">
            <div className="p-2 rounded bg-[#1a1b1e] border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total</div>
              <div className="text-base font-bold text-foreground font-mono">{runReport.totalRequests}</div>
            </div>
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/30">
              <div className="text-[10px] text-emerald-400 uppercase font-semibold">Passed</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{runReport.passedRequests}</div>
            </div>
            <div className="p-2 rounded bg-rose-950/20 border border-rose-800/30">
              <div className="text-[10px] text-rose-400 uppercase font-semibold">Failed</div>
              <div className="text-base font-bold text-rose-400 font-mono">{runReport.failedRequests}</div>
            </div>
            <div className="p-2 rounded bg-[#1a1b1e] border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</div>
              <div className="text-base font-bold text-foreground font-mono">{formatDuration(runReport.totalDurationMs)}</div>
            </div>
          </div>
        )}

        {/* Results List */}
        <ScrollArea className="flex-1 p-3 bg-[#141517]">
          {runReport ? (
            <div className="space-y-1.5">
              {runReport.results.map((item) => (
                <CollectionRunResultRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2 select-none">
              <Play className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs font-medium text-foreground">
                Ready to execute {allRequests.length} requests in "{collection.name}"
              </p>
              <p className="text-[11px] text-muted-foreground/80 max-w-sm">
                Each request will run sequentially and execute its post-response test scripts.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
