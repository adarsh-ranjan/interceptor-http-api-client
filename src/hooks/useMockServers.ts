import { useEffect, useMemo, useState } from 'react';
import { MockServer } from '../types/server';
import { loadMockServers, saveMockServers } from '../utils/mockServerDefaults';

export function useMockServers() {
  const [mockServers, setMockServers] = useState<MockServer[]>(() => loadMockServers());
  const [activeMockServerId, setActiveMockServerId] = useState<string>('');

  useEffect(() => {
    saveMockServers(mockServers);
  }, [mockServers]);

  const runningMockServerCount = useMemo(
    () => mockServers.filter((s) => s.status === 'running').length,
    [mockServers]
  );

  const getServerPort = (serverId: string): number => {
    const server = mockServers.find((s) => s.id === serverId);
    return server ? server.port : 3001;
  };

  return {
    mockServers,
    setMockServers,
    activeMockServerId,
    setActiveMockServerId,
    runningMockServerCount,
    getServerPort,
  };
}
