import React from 'react';
import { MockServer } from '../../types/server';
import { useClipboard } from '../../hooks/useClipboard';
import { AlertCircle, Check, Copy, Play, Plus, Square, Trash2 } from 'lucide-react';
import { MockServerSelectorDropdown } from '../MockServerSelectorDropdown';

interface MockServerHeaderProps {
  servers: MockServer[];
  currentServer: MockServer;
  isStartingServer: boolean;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onUpdateServer: (updated: Partial<MockServer>) => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onDeleteServer: (id: string, e: React.MouseEvent) => void;
}

export const MockServerHeader: React.FC<MockServerHeaderProps> = ({
  servers,
  currentServer,
  isStartingServer,
  onSelectServer,
  onCreateServer,
  onUpdateServer,
  onStartServer,
  onStopServer,
  onDeleteServer,
}) => {
  const { copied: copiedUrl, copy: copyUrl } = useClipboard(2000);
  const isRunning = currentServer.status === 'running';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#222224] border-b border-[#333333] shrink-0 gap-4">
      <div className="flex items-center gap-2">
        <MockServerSelectorDropdown
          servers={servers}
          selectedServerId={currentServer.id}
          onSelectServer={onSelectServer}
          onCreateServer={onCreateServer}
        />

        <button
          type="button"
          onClick={onCreateServer}
          className="p-1 text-[#888888] hover:text-[#d99b26] hover:bg-[#26292b] rounded transition-colors"
          title="Create another mock server"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-[#333333]">
          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Running on http://localhost:{currentServer.port}</span>
              {currentServer.proxyFallbackEnabled && currentServer.proxyFallbackUrl && (
                <span className="text-[9px] text-purple-300 bg-purple-500/20 px-1 py-0.2 rounded font-mono border border-purple-500/30 ml-1">
                  Hybrid Proxy
                </span>
              )}
            </div>
          ) : currentServer.status === 'error' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 font-medium">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="truncate max-w-[280px]" title={currentServer.errorMessage}>
                {currentServer.errorMessage || 'Server Error'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#26292b] border border-[#444444] text-[11px] text-[#888888]">
              <span className="w-2 h-2 rounded-full bg-[#666666]" />
              <span>Stopped</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => copyUrl(`http://localhost:${currentServer.port}`)}
            className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors"
            title="Copy base URL to clipboard"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#888888]">
          <span>Port:</span>
          <input
            type="number"
            disabled={isRunning}
            value={currentServer.port}
            onChange={(e) => onUpdateServer({ port: parseInt(e.target.value) || 3000 })}
            className={`w-16 px-2 py-0.5 rounded bg-[#1a1a1a] border text-xs font-mono text-center focus:outline-none ${
              isRunning
                ? 'border-[#333333] text-[#888888]'
                : 'border-[#444444] text-white focus:border-[#d99b26]'
            }`}
          />
        </div>

        <label
          className="flex items-center gap-1.5 text-xs text-[#888888] cursor-pointer"
          title="Auto-respond to OPTIONS requests with CORS headers"
        >
          <input
            type="checkbox"
            checked={currentServer.corsEnabled}
            onChange={(e) => onUpdateServer({ corsEnabled: e.target.checked })}
            className="accent-[#d99b26] rounded cursor-pointer"
          />
          <span>CORS</span>
        </label>

        <div className="flex items-center gap-1.5 text-xs text-[#888888]">
          <label
            className="flex items-center gap-1 cursor-pointer"
            title="Forward unmatched routes to a real upstream backend"
          >
            <input
              type="checkbox"
              checked={!!currentServer.proxyFallbackEnabled}
              onChange={(e) => onUpdateServer({ proxyFallbackEnabled: e.target.checked })}
              className="accent-[#d99b26] rounded cursor-pointer"
            />
            <span>Proxy Fallback:</span>
          </label>
          {currentServer.proxyFallbackEnabled && (
            <input
              type="text"
              value={currentServer.proxyFallbackUrl || ''}
              onChange={(e) => onUpdateServer({ proxyFallbackUrl: e.target.value })}
              placeholder="https://api.example.com"
              className="w-44 px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#444444] text-xs font-mono text-white focus:outline-none focus:border-[#d99b26]"
              title="Target upstream URL (e.g. https://api.example.com)"
            />
          )}
        </div>

        {isRunning ? (
          <button
            type="button"
            onClick={onStopServer}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3 fill-rose-300" />
            <span>Stop Server</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isStartingServer}
            onClick={onStartServer}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-black hover:bg-emerald-400 rounded text-xs font-semibold transition-colors shadow cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-black" />
            <span>{isStartingServer ? 'Starting...' : 'Start Server'}</span>
          </button>
        )}

        {servers.length > 1 && (
          <button
            type="button"
            onClick={(e) => onDeleteServer(currentServer.id, e)}
            className="p-1 text-[#666666] hover:text-rose-400 rounded hover:bg-[#26292b] transition-colors ml-1"
            title="Delete this server"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
