import React from 'react';
import { ServerLogEntry } from '../../types/server';
import { LogFilterMode } from '../../hooks/useMockServerWorkbench';
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink, Search } from 'lucide-react';
import { getMockMethodBadgeClass } from './mockBadgeUtils';

interface MockTrafficLogsProps {
  port: number;
  logs: ServerLogEntry[];
  logsSearch: string;
  logFilter: LogFilterMode;
  expandedLogId: string | null;
  copiedLogId: string | null;
  onLogsSearchChange: (val: string) => void;
  onLogFilterChange: (filter: LogFilterMode) => void;
  onClearLogs: () => void;
  onToggleExpandLog: (id: string) => void;
  onCopyCurl: (log: ServerLogEntry) => void;
  onReplayInClient?: (log: ServerLogEntry) => void;
}

export const MockTrafficLogs: React.FC<MockTrafficLogsProps> = ({
  port,
  logs,
  logsSearch,
  logFilter,
  expandedLogId,
  copiedLogId,
  onLogsSearchChange,
  onLogFilterChange,
  onClearLogs,
  onToggleExpandLog,
  onCopyCurl,
  onReplayInClient,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 bg-[#222224] p-2 rounded border border-[#333333]">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-[#666666] absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search traffic logs..."
            value={logsSearch}
            onChange={(e) => onLogsSearchChange(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded pl-8 pr-2 py-1 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {(['all', '2xx', '4xx', '5xx', 'proxied'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onLogFilterChange(filter)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                logFilter === filter
                  ? 'bg-[#d99b26] text-black font-semibold'
                  : 'bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#333333]'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'proxied' ? 'Proxied' : filter.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClearLogs}
          className="px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[#888888] hover:text-white rounded transition-colors cursor-pointer"
        >
          Clear Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {logs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
          const isClientErr = log.statusCode >= 400 && log.statusCode < 500;

          return (
            <div
              key={log.id}
              className="border border-[#333333] rounded bg-[#222224]/50 hover:bg-[#222224] transition-colors overflow-hidden"
            >
              <div
                onClick={() => onToggleExpandLog(log.id)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getMockMethodBadgeClass(
                      log.method
                    )}`}
                  >
                    {log.method}
                  </span>
                  <span className="text-white font-medium">{log.path}</span>
                  {Object.keys(log.requestQuery).length > 0 && (
                    <span className="text-[#888888] text-[11px]">
                      ?{new URLSearchParams(log.requestQuery).toString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {log.isProxied && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      PROXIED
                    </span>
                  )}

                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSuccess
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isClientErr
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {log.statusCode}
                  </span>

                  <span className="text-[11px] font-mono text-[#777777]">{log.durationMs}ms</span>
                  <span className="text-[10px] text-[#666666]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>

                  {onReplayInClient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplayInClient(log);
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[10px] text-[#cccccc] hover:text-[#d99b26] transition-colors cursor-pointer"
                      title="Open this request in Client Workbench"
                    >
                      <ExternalLink className="w-3 h-3 text-[#d99b26]" />
                      <span>Replay</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyCurl(log);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[10px] text-[#cccccc] hover:text-white transition-colors cursor-pointer"
                    title="Copy request as cURL command"
                  >
                    {copiedLogId === log.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>cURL</span>
                  </button>

                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 border-t border-[#333333] bg-[#141517] text-xs font-mono space-y-3">
                  {log.isProxied && log.proxyTargetUrl && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 text-[11px] text-purple-300">
                      <span className="font-semibold">Forwarded to Upstream Target: </span>
                      <span className="font-mono">{log.proxyTargetUrl}</span>
                    </div>
                  )}

                  {Object.keys(log.requestQuery).length > 0 && (
                    <div>
                      <span className="text-[#888888] text-[11px] font-semibold block mb-1">
                        Query Parameters:
                      </span>
                      <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-[#cccccc] overflow-x-auto">
                        {JSON.stringify(log.requestQuery, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.requestBody && (
                    <div>
                      <span className="text-[#888888] text-[11px] font-semibold block mb-1">
                        Request Body:
                      </span>
                      <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-[#cccccc] overflow-x-auto">
                        {typeof log.requestBody === 'object'
                          ? JSON.stringify(log.requestBody, null, 2)
                          : String(log.requestBody)}
                      </pre>
                    </div>
                  )}

                  {log.responseBodyPreview && (
                    <div>
                      <span className="text-[#888888] text-[11px] font-semibold block mb-1">
                        Served Response Body:
                      </span>
                      <pre className="bg-[#1a1a1a] p-2 rounded text-[11px] text-emerald-300 overflow-x-auto">
                        {log.responseBodyPreview}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="text-center py-12 text-xs text-[#666666]">
            No traffic logged yet. Send a request to{' '}
            <code className="text-[#d99b26]">http://localhost:{port}</code> to see live logs!
          </div>
        )}
      </div>
    </div>
  );
};
