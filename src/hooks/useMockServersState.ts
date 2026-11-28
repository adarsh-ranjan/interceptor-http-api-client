import { useState, useEffect, useMemo } from 'react';
import { MockServer } from '../types/server';
import { loadMockServers, saveMockServers } from '../utils/mockServerDefaults';

export function useMockServersState() {
  const [mainView, setMainView] = useState<'requests' | 'mock-servers'>('requests');
  const [mockServers, setMockServers] = useState<MockServer[]>(() => loadMockServers());
  const [activeMockServerId, setActiveMockServerId] = useState<string>('');

  useEffect(() => {
    saveMockServers(mockServers);
  }, [mockServers]);

  const runningMockServerCount = useMemo(
    () => mockServers.filter((s) => s.status === 'running').length,
    [mockServers]
  );

  return {
    mainView,
    setMainView,
    mockServers,
    setMockServers,
    activeMockServerId,
    setActiveMockServerId,
    runningMockServerCount,
  };
}
