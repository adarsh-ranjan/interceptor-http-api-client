import { MockServer, ServerLogEntry, ServerStatus } from '../types/server';

function getMockServerApi() {
  return window.interceptor?.mockServer;
}

export const mockServerClient = {
  async startServer(server: MockServer): Promise<{ success: boolean; error?: string }> {
    const api = getMockServerApi();
    if (api?.startServer) {
      return api.startServer(server);
    }

    // Browser fallback simulation
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { success: true };
  },

  async stopServer(serverId: string): Promise<{ success: boolean; error?: string }> {
    const api = getMockServerApi();
    if (api?.stopServer) {
      return api.stopServer(serverId);
    }
    return { success: true };
  },

  async getStore(serverId: string): Promise<Record<string, any> | null> {
    const api = getMockServerApi();
    if (!api?.getStore) return null;
    return api.getStore(serverId);
  },

  async clearStore(serverId: string): Promise<boolean> {
    const api = getMockServerApi();
    if (!api?.clearStore) return false;
    return api.clearStore(serverId);
  },

  async setStore(serverId: string, data: Record<string, any>): Promise<boolean> {
    const api = getMockServerApi();
    if (!api?.setStore) return false;
    return api.setStore(serverId, data);
  },

  subscribeToLogs(callback: (log: ServerLogEntry) => void): () => void {
    const api = getMockServerApi();
    if (!api?.onServerLog) return () => {};
    return api.onServerLog(callback);
  },

  subscribeToStatusChanges(
    callback: (data: { serverId: string; status: ServerStatus; error?: string }) => void
  ): () => void {
    const api = getMockServerApi();
    if (!api?.onServerStatusChange) return () => {};
    return api.onServerStatusChange(callback);
  },
};
