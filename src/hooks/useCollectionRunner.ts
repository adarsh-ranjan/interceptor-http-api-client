import { useCallback, useMemo, useState } from 'react';
import { executePreparedRequest } from '../services/httpClient';
import {
  Collection,
  CollectionRunItemResult,
  CollectionRunReport,
  Environment,
} from '../types';
import { flattenCollectionRequests } from '../utils/collectionTree';
import { generateId } from '../utils/id';

interface UseCollectionRunnerOptions {
  collection: Collection | null;
  environments: Environment[];
  activeEnvId: string | null;
}

export function useCollectionRunner({
  collection,
  environments,
  activeEnvId,
}: UseCollectionRunnerOptions) {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(activeEnvId);
  const [delayMs, setDelayMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{
    current: number;
    total: number;
    requestName: string;
  } | null>(null);
  const [runReport, setRunReport] = useState<CollectionRunReport | null>(null);

  const allRequests = useMemo(
    () => (collection ? flattenCollectionRequests(collection.items) : []),
    [collection]
  );

  const activeEnv = useMemo(
    () => environments.find((e) => e.id === selectedEnvId),
    [environments, selectedEnvId]
  );

  const startRun = useCallback(async () => {
    if (!collection || allRequests.length === 0 || isRunning) return;

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

      const { response, interpolatedRequest, finalUrl } = await executePreparedRequest(
        request,
        activeEnv,
        environments
      );

      if (response.error && response.status === 0) {
        failedCount += 1;
        itemResults.push({
          id: generateId(),
          name,
          method: interpolatedRequest.method,
          url: finalUrl,
          status: 0,
          statusText: 'Error',
          timeMs: 0,
          testResults: [],
          error: response.error,
        });
      } else {
        const testResults = response.testResults || [];
        passedCount += testResults.filter((t) => t.passed).length;
        failedCount += testResults.filter((t) => !t.passed).length;

        itemResults.push({
          id: generateId(),
          name,
          method: interpolatedRequest.method,
          url: finalUrl,
          status: response.status,
          statusText: response.statusText,
          timeMs: response.timeMs,
          testResults,
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
  }, [collection, allRequests, isRunning, delayMs, activeEnv, environments]);

  return {
    selectedEnvId,
    setSelectedEnvId,
    delayMs,
    setDelayMs,
    isRunning,
    currentProgress,
    runReport,
    allRequests,
    startRun,
  };
}
