import React, { useState } from 'react';
import { ServerLogEntry } from '../../types/server';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import {
  Search,
  Trash2,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';

interface MockServerTrafficLogsProps {
  logs: ServerLogEntry[];
  onClearLogs: () => void;
  onReplayInClient?: (log: ServerLogEntry) => void;
}

type LogFilter = 'all' | '2xx' | '4xx' | '5xx' | 'proxied';

export const MockServerTrafficLogs: React.FC<MockServerTrafficLogsProps> = ({
  logs,
  onClearLogs,
  onReplayInClient,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LogFilter>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    // 1. Text filter
    const matchesSearch =
      log.path.toLowerCase().includes(search.toLowerCase()) ||
      log.method.toLowerCase().includes(search.toLowerCase()) ||
      String(log.statusCode).includes(search);

    if (!matchesSearch) return false;

    // 2. Status filter
    if (filter === '2xx') return log.statusCode >= 200 && log.statusCode < 300;
    if (filter === '4xx') return log.statusCode >= 400 && log.statusCode < 500;
    if (filter === '5xx') return log.statusCode >= 500;
    if (filter === 'proxied') return !!log.proxied;
    return true;
  });

  const handleCopyCurl = async (e: React.MouseEvent, log: ServerLogEntry) => {
    e.stopPropagation();
    const curl = `curl -X ${log.method} "http://localhost:${log.port}${log.url}"`;
    try {
      await navigator.clipboard.writeText(curl);
      setCopiedLogId(log.id);
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (status >= 300 && status < 400) return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
    return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#1a1b1e] p-2 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traffic logs..."
            className="pl-8 h-8 text-xs bg-[#141517]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {(['all', '2xx', '4xx', '5xx', 'proxied'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'amber' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-7 text-[11px] px-2 capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Clear Logs */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearLogs}
          className="text-muted-foreground hover:text-destructive h-7 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          <span>Clear</span>
        </Button>
      </div>

      {/* Log Entries */}
      <ScrollArea className="flex-1 rounded-lg border border-border bg-[#141517]">
        <div className="p-2 space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p>No traffic recorded yet</p>
              <p className="text-[11px] text-muted-foreground/70">
                Send HTTP requests to your mock server port to inspect traffic logs here.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-md border border-border bg-[#1a1b1e] overflow-hidden text-xs transition-colors"
                >
                  {/* Log Header Row */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[#202226]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}

                      <Badge
                        variant={log.method.toLowerCase() as any}
                        className="px-1.5 py-0 text-[9px] font-bold shrink-0"
                      >
                        {log.method}
                      </Badge>

                      <span className="font-mono text-xs text-foreground truncate">
                        {log.path}
                      </span>

                      {log.proxied && (
                        <Badge variant="amber" className="text-[9px] px-1 py-0 flex items-center gap-1">
                          <Radio className="w-2.5 h-2.5" />
                          <span>PROXIED</span>
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          log.statusCode
                        )}`}
                      >
                        {log.statusCode}
                      </span>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{log.durationMs}ms</span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {onReplayInClient && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onReplayInClient(log)}
                            title="Replay in Client Workbench"
                            className="text-primary hover:text-white"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleCopyCurl(e, log)}
                          title="Copy as cURL command"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedLogId === log.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Inspector */}
                  {isExpanded && (
                    <div className="p-3 border-t border-border bg-[#141517] space-y-3 font-mono text-xs">
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                          Request Headers
                        </div>
                        <pre className="p-2 rounded bg-[#1a1b1e] border border-border/50 text-[11px] text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.headers, null, 2)}
                        </pre>
                      </div>

                      {log.body && (
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                            Request Body Payload
                          </div>
                          <pre className="p-2 rounded bg-[#1a1b1e] border border-border/50 text-[11px] text-foreground overflow-x-auto">
                            {typeof log.body === 'string'
                              ? log.body
                              : JSON.stringify(log.body, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
