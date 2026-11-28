import React from 'react';
import { ServerLogEntry } from '../../types/server';
import {
  Search,
  Radio,
  ChevronDown,
  ChevronRight,
  Send,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

interface MockServerTrafficLogsProps {
  logs: ServerLogEntry[];
  onClearLogs: () => void;
  logsSearch: string;
  onLogsSearchChange: (search: string) => void;
  logFilter: 'all' | '2xx' | '4xx' | '5xx' | 'proxied';
  onLogFilterChange: (filter: 'all' | '2xx' | '4xx' | '5xx' | 'proxied') => void;
  expandedLogId: string | null;
  onToggleExpandLog: (id: string) => void;
  onReplayInClient?: (log: ServerLogEntry) => void;
  copiedLogId: string | null;
  onCopyLogPayload: (log: ServerLogEntry) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  OPTIONS: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  HEAD: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
};

export const MockServerTrafficLogs: React.FC<MockServerTrafficLogsProps> = ({
  logs,
  onClearLogs,
  logsSearch,
  onLogsSearchChange,
  logFilter,
  onLogFilterChange,
  expandedLogId,
  onToggleExpandLog,
  onReplayInClient,
  copiedLogId,
  onCopyLogPayload,
}) => {
  const filteredLogs = logs.filter((log) => {
    if (logFilter === '2xx' && (log.statusCode < 200 || log.statusCode >= 300)) return false;
    if (logFilter === '4xx' && (log.statusCode < 400 || log.statusCode >= 500)) return false;
    if (logFilter === '5xx' && (log.statusCode < 500 || log.statusCode >= 600)) return false;
    if (logFilter === 'proxied' && !log.proxied) return false;

    if (logsSearch) {
      const q = logsSearch.toLowerCase();
      return (
        log.path.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q) ||
        String(log.statusCode).includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] overflow-hidden select-none">
      {/* Logs Controls Bar */}
      <div className="p-3 border-b border-[#333333] flex items-center justify-between gap-3 bg-[#1e1e20] shrink-0">
        <div className="flex items-center gap-2 flex-1">
          {/* Search Logs */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={logsSearch}
              onChange={(e) => onLogsSearchChange(e.target.value)}
              placeholder="Search incoming requests..."
              className="w-full bg-[#26292b] border border-[#333333] rounded pl-8 pr-2.5 py-1 text-xs text-[#cccccc] placeholder:text-[#666666] outline-none focus:border-[#d99b26]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#26292b] p-0.5 rounded border border-[#333333]">
            {(['all', '2xx', '4xx', '5xx', 'proxied'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onLogFilterChange(filter)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer uppercase ${
                  logFilter === filter
                    ? 'bg-[#d99b26] text-white font-medium'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Logs */}
        <button
          onClick={onClearLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#26292b] hover:bg-[#333336] text-[#aaaaaa] hover:text-white border border-[#333333] text-xs transition-colors cursor-pointer disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Logs Table / List */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#666666] text-xs space-y-2 p-8">
            <Radio className="w-8 h-8 stroke-1 text-[#444444] animate-pulse" />
            <p>No traffic recorded yet</p>
            <p className="text-[11px] text-[#555555]">
              Requests sent to this server will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2d]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const methodColor = METHOD_COLORS[log.method] || 'text-zinc-400 border-zinc-700';

              return (
                <div key={log.id} className="hover:bg-[#222224] transition-colors">
                  <div
                    onClick={() => onToggleExpandLog(log.id)}
                    className="flex items-center justify-between px-4 py-2 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
                      )}

                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${methodColor}`}
                      >
                        {log.method}
                      </span>

                      <span className="font-mono text-white text-xs truncate">
                        {log.path}
                      </span>

                      {log.proxied && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          PROXIED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <span
                        className={
                          log.statusCode >= 200 && log.statusCode < 300
                            ? 'text-emerald-400 font-bold'
                            : log.statusCode >= 400 && log.statusCode < 500
                            ? 'text-amber-400 font-bold'
                            : log.statusCode >= 500
                            ? 'text-rose-400 font-bold'
                            : 'text-[#888888]'
                        }
                      >
                        {log.statusCode}
                      </span>

                      <span className="text-[#666666]">{log.durationMs}ms</span>
                      <span className="text-[#666666]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>

                      {/* Replay in Client button */}
                      {onReplayInClient && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReplayInClient(log);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#26292b] hover:bg-[#333336] text-[#cccccc] hover:text-white border border-[#333333] transition-colors cursor-pointer"
                          title="Open this request in Client Workbench"
                        >
                          <Send className="w-3 h-3 text-[#d99b26]" />
                          <span>Replay</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Request/Response Payload Breakdown */}
                  {isExpanded && (
                    <div className="px-8 pb-3 pt-1 text-xs bg-[#161617] border-t border-[#2a2a2d] space-y-3 font-mono">
                      {/* Query Parameters */}
                      {log.requestQuery && Object.keys(log.requestQuery).length > 0 && (
                        <div>
                          <span className="text-[#888888] font-bold text-[11px] block mb-1">
                            Query Parameters:
                          </span>
                          <pre className="p-2 rounded bg-[#1e1e20] text-[#cccccc] text-[11px] overflow-x-auto">
                            {JSON.stringify(log.requestQuery, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Request Headers */}
                      {log.requestHeaders && (
                        <div>
                          <span className="text-[#888888] font-bold text-[11px] block mb-1">
                            Request Headers:
                          </span>
                          <pre className="p-2 rounded bg-[#1e1e20] text-[#cccccc] text-[11px] overflow-x-auto max-h-32">
                            {JSON.stringify(log.requestHeaders, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Request Body */}
                      {log.requestBody && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#888888] font-bold text-[11px]">
                              Request Body:
                            </span>
                            <button
                              onClick={() => onCopyLogPayload(log)}
                              className="text-[10px] text-[#777777] hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedLogId === log.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy</span>
                            </button>
                          </div>
                          <pre className="p-2 rounded bg-[#1e1e20] text-[#cccccc] text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {typeof log.requestBody === 'object'
                              ? JSON.stringify(log.requestBody, null, 2)
                              : String(log.requestBody)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
