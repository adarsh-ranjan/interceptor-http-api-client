import React, { useMemo, useRef, useState } from 'react';
import { WebSocketMessage, WebSocketStatus } from '../types';
import { formatBytes } from '../utils/http';
import { isValidJsonString } from '../utils/jsonTokenizer';
import { useKeyedClipboard } from '../hooks/useClipboard';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Info,
  Radio,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface WebSocketWorkbenchProps {
  url?: string;
  onUrlChange?: (url: string) => void;
  status: WebSocketStatus;
  messages: WebSocketMessage[];
  onConnect: (url: string) => void;
  onDisconnect: () => void;
  onSendMessage: (message: string) => void;
  onClearMessages: () => void;
}

export const WebSocketWorkbench: React.FC<WebSocketWorkbenchProps> = ({
  url = 'wss://echo.websocket.org',
  onUrlChange,
  status,
  messages,
  onConnect,
  onDisconnect,
  onSendMessage,
  onClearMessages,
}) => {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [messageInput, setMessageInput] = useState(
    JSON.stringify({ message: 'Hello from Interceptor!', timestamp: Date.now() }, null, 2)
  );
  const [payloadType, setPayloadType] = useState<'json' | 'text'>('json');
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replayedId, setReplayedId] = useState<string | null>(null);
  const { copiedKey: copiedId, copy: copyMessage } = useKeyedClipboard(2000);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'connected' || status === 'connecting') {
      onDisconnect();
    } else if (currentUrl.trim()) {
      onConnect(currentUrl.trim());
    }
  };

  const handleSend = () => {
    if (!messageInput.trim() || status !== 'connected') return;
    onSendMessage(messageInput.trim());
  };

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(messageInput);
      setMessageInput(JSON.stringify(parsed, null, 2));
      setPayloadType('json');
    } catch {
      // Not JSON; ignore
    }
  };

  const handleReplayMessage = (id: string, data: string) => {
    setMessageInput(data);
    setReplayedId(id);
    setTimeout(() => setReplayedId(null), 1500);
    setPayloadType(isValidJsonString(data) ? 'json' : 'text');
    textareaRef.current?.focus();
  };

  const sentCount = useMemo(() => messages.filter((m) => m.type === 'sent').length, [messages]);
  const receivedCount = useMemo(
    () => messages.filter((m) => m.type === 'received').length,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filter !== 'all' && m.type !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.data.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [messages, filter, searchQuery]);

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 font-mono text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Disconnected
          </span>
        );
    }
  };

  const inputLines = useMemo(() => messageInput.split('\n'), [messageInput]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-xs overflow-hidden select-none">
      <form
        onSubmit={handleUrlSubmit}
        className="flex items-center gap-2 p-2 bg-[#1a1a1a] border-b border-[#333333]"
      >
        <div className="flex items-center px-3 py-2 bg-[#222224] border border-[#333333] rounded-l-md font-mono font-bold text-emerald-400 text-xs shadow-xs">
          WSS
        </div>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => {
              setCurrentUrl(e.target.value);
              onUrlChange?.(e.target.value);
            }}
            placeholder="wss://echo.websocket.org"
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded-r-md px-3.5 py-2 text-xs font-mono text-[#cccccc] placeholder:text-[#666666] focus:outline-none focus:border-[#444444]"
          />
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}

          {status === 'connected' || status === 'connecting' ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-medium shadow-sm transition-colors cursor-pointer"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#d99b26] hover:bg-[#c48b20] text-white rounded-md font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#333333]">
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-[#1a1a1a] overflow-hidden">
          <div className="flex items-center justify-between px-3 border-b border-[#333333] bg-[#1a1a1a]">
            <div className="flex items-center gap-1">
              <div className="px-3 py-2 text-xs font-semibold border-b-2 border-[#d99b26] text-white -mb-px flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#d99b26]" />
                <span>Message Payload</span>
              </div>

              <div className="flex items-center ml-2 bg-[#222224] border border-[#333333] rounded p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setPayloadType('json');
                    handlePrettify();
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-sans transition-colors cursor-pointer ${
                    payloadType === 'json'
                      ? 'bg-[#26292b] text-[#d99b26] font-semibold'
                      : 'text-[#888888] hover:text-white'
                  }`}
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => setPayloadType('text')}
                  className={`px-2 py-0.5 rounded text-[11px] font-sans transition-colors cursor-pointer ${
                    payloadType === 'text'
                      ? 'bg-orange-500/20 text-orange-400 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrettify}
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-medium px-2 py-1 rounded hover:bg-orange-500/10 cursor-pointer transition-colors"
                title="Format JSON"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prettify</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={status !== 'connected'}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded text-white font-medium shadow-md transition-all cursor-pointer ${
                  status === 'connected'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-950/40'
                    : 'bg-slate-700 cursor-not-allowed opacity-50'
                }`}
                title={status !== 'connected' ? 'Connect to WebSocket first' : 'Send message frame'}
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden bg-[#1a1a1a]">
            <div className="w-10 shrink-0 py-2.5 pr-2 select-none text-right font-mono text-xs leading-5 text-[#666666] border-r border-[#333333] bg-[#222224]/50 overflow-hidden">
              {inputLines.map((_, i) => (
                <div key={i} className="h-5">
                  {i + 1}
                </div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Enter text or JSON payload to send..."
              spellCheck={false}
              className="flex-1 h-full p-2.5 font-mono text-xs bg-transparent text-[#cccccc] resize-none outline-none leading-5 selection:bg-[#d99b26]/30 caret-[#d99b26] overflow-auto"
            />
          </div>

          <div className="p-2 border-t border-[#333333] bg-[#1a1a1a] flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
            <span className="text-[#888888] text-[10px] uppercase font-bold shrink-0">
              Samples:
            </span>
            <button
              type="button"
              onClick={() =>
                setMessageInput(JSON.stringify({ type: 'ping', timestamp: Date.now() }, null, 2))
              }
              className="px-2 py-0.5 rounded bg-[#222224] hover:bg-[#2e3235] text-[#cccccc] hover:text-white border border-[#333333] shrink-0 font-mono text-[10px] transition-colors cursor-pointer"
            >
              Ping Frame
            </button>
            <button
              type="button"
              onClick={() =>
                setMessageInput(
                  JSON.stringify({ action: 'subscribe', channel: 'live_stream', id: 1 }, null, 2)
                )
              }
              className="px-2 py-0.5 rounded bg-[#222224] hover:bg-[#2e3235] text-[#cccccc] hover:text-white border border-[#333333] shrink-0 font-mono text-[10px] transition-colors cursor-pointer"
            >
              Subscribe Action
            </button>
            <button
              type="button"
              onClick={() =>
                setMessageInput(
                  JSON.stringify({ event: 'echo', data: 'Hello from Interceptor!' }, null, 2)
                )
              }
              className="px-2 py-0.5 rounded bg-[#222224] hover:bg-[#2e3235] text-[#cccccc] hover:text-white border border-[#333333] shrink-0 font-mono text-[10px] transition-colors cursor-pointer"
            >
              Echo Payload
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-[#1a1a1a] overflow-hidden">
          <div className="flex items-center justify-between px-3 border-b border-[#333333] bg-[#1a1a1a] select-none flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filter === 'all'
                    ? 'border-[#d99b26] text-white font-semibold -mb-px'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All Events</span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono font-medium">
                  {messages.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('received')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filter === 'received'
                    ? 'border-orange-500 text-white font-semibold -mb-px'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Received</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-medium">
                  {receivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('sent')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filter === 'sent'
                    ? 'border-orange-500 text-white font-semibold -mb-px'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Sent</span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono font-medium">
                  {sentCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 py-1">
              <div className="relative flex items-center">
                <Search className="w-3 h-3 absolute left-2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#222224] border border-[#333333] rounded pl-6 pr-2 py-1 text-[11px] text-[#cccccc] placeholder:text-[#666666] focus:outline-none focus:border-[#444444] w-32 md:w-36 font-sans"
                />
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={onClearMessages}
                  className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-rose-400 px-2 py-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
                  title="Clear event stream"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-[#777777] select-none">
                <Radio className="w-8 h-8 text-[#555555] mb-2 stroke-[1.5]" />
                <p className="font-medium text-[#cccccc]">No events in stream</p>
                <p className="text-[11px] text-[#777777] mt-0.5">
                  Connect to a WebSocket server above to start streaming bidirectional message frames.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSent = msg.type === 'sent';
                const isSystem = msg.type === 'system';

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="p-2 rounded bg-[#222224] border border-[#333333] flex items-center justify-between text-[#888888] text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#d99b26]" />
                        <span>{msg.data}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#666666]">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                }

                const isJson = isValidJsonString(msg.data);

                return (
                  <div
                    key={msg.id}
                    className="rounded-md border bg-[#222224] border-[#333333] hover:border-[#444444] transition-all overflow-hidden shadow-xs group"
                  >
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-[#333333] select-none">
                      <div className="flex items-center gap-2">
                        {isSent ? (
                          <span className="flex items-center gap-1 font-mono font-bold text-[10px] text-[#d99b26] bg-[#d99b26]/10 border border-[#d99b26]/30 px-2 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" />
                            SENT
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                            <ArrowDownLeft className="w-3 h-3" />
                            RECEIVED
                          </span>
                        )}

                        <span className="text-[10px] text-[#888888] font-mono bg-[#26292b] px-1.5 py-0.2 rounded border border-[#333333]">
                          {isJson ? 'JSON' : 'TEXT'}
                        </span>

                        <span className="text-[10px] text-[#666666] font-mono">
                          {formatBytes(msg.sizeBytes)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#666666] font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleReplayMessage(msg.id, msg.data)}
                          className="flex items-center gap-1 text-[#888888] hover:text-[#d99b26] p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Load payload into composer"
                        >
                          {replayedId === msg.id ? (
                            <Check className="w-3 h-3 text-[#d99b26]" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyMessage(msg.id, msg.data)}
                          className="text-[#888888] hover:text-white p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Copy event payload"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <pre className="p-3 font-mono text-xs text-[#cccccc] whitespace-pre-wrap select-text leading-relaxed bg-[#1a1a1a] selection:bg-[#d99b26]/30 overflow-x-auto">
                      {msg.data}
                    </pre>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
