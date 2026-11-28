import React from 'react';
import { MockServer } from '../../types/server';
import { MockServerSelectorDropdown } from '../MockServerSelectorDropdown';
import {
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Layers,
  Radio,
  Database,
  Copy,
  Check,
} from 'lucide-react';

interface MockServerHeaderProps {
  servers: MockServer[];
  currentServer: MockServer;
  selectedServerId: string;
  onSelectServerId: (id: string) => void;
  onNewServer: () => void;
  onOpenSettings: () => void;
  onToggleServer: () => void;
  isStartingServer: boolean;
  workbenchTab: 'editor' | 'logs' | 'store';
  onSelectWorkbenchTab: (tab: 'editor' | 'logs' | 'store') => void;
  logsCount: number;
  copiedUrl: boolean;
  onCopyUrl: () => void;
}

export const MockServerHeader: React.FC<MockServerHeaderProps> = ({
  servers,
  currentServer,
  selectedServerId,
  onSelectServerId,
  onNewServer,
  onOpenSettings,
  onToggleServer,
  isStartingServer,
  workbenchTab,
  onSelectWorkbenchTab,
  logsCount,
  copiedUrl,
  onCopyUrl,
}) => {
  const isRunning = currentServer?.status === 'running';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333333] shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* Mock Server Selector Dropdown */}
        <MockServerSelectorDropdown
          servers={servers}
          selectedServerId={selectedServerId}
          onSelectServer={onSelectServerId}
          onNewServer={onNewServer}
          onOpenSettings={onOpenSettings}
        />

        {/* Server Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
            isRunning
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
            }`}
          />
          <span>{isRunning ? 'RUNNING' : 'STOPPED'}</span>
        </div>

        {/* Start / Stop Toggle Button */}
        <button
          onClick={onToggleServer}
          disabled={isStartingServer}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
            isRunning
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isStartingServer ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isRunning ? (
            <Square className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>{isRunning ? 'Stop Server' : 'Start Server'}</span>
        </button>

        {/* Server Base URL with Copy */}
        {isRunning && (
          <div className="flex items-center gap-1.5 bg-[#222224] border border-[#333333] px-2 py-0.5 rounded text-[11px] font-mono text-[#aaaaaa]">
            <span>http://localhost:{currentServer.port}</span>
            <button
              onClick={onCopyUrl}
              className="text-[#777777] hover:text-[#cccccc] transition-colors p-0.5 cursor-pointer"
              title="Copy base URL"
            >
              {copiedUrl ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Center Tabs: Editor / Live Logs / State Store */}
      <div className="flex items-center gap-1 bg-[#222224] p-0.5 rounded border border-[#333333]">
        <button
          onClick={() => onSelectWorkbenchTab('editor')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
            workbenchTab === 'editor'
              ? 'bg-[#d99b26] text-white font-medium'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Routes & Logic</span>
        </button>

        <button
          onClick={() => onSelectWorkbenchTab('logs')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
            workbenchTab === 'logs'
              ? 'bg-[#d99b26] text-white font-medium'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Traffic Logs</span>
          {logsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#1a1a1a] text-[10px] font-mono">
              {logsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectWorkbenchTab('store')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
            workbenchTab === 'store'
              ? 'bg-[#d99b26] text-white font-medium'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>State Store</span>
        </button>
      </div>
    </div>
  );
};
