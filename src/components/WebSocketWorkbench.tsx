import React, { useState, useEffect, useRef } from 'react';
import { WebSocketMessage, WebSocketStatus } from '../types';
import { formatBytes } from '../utils/http';
import {
  Radio,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Wifi,
  WifiOff,
  Filter,
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
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'connected' || status === 'connecting') {
      onDisconnect();
    } else {
      if (currentUrl.trim()) {
        onConnect(currentUrl.trim());
      }
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
    } catch {
      // not json, ignore
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.type === filter;
  });

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] text-xs overflow-hidden">
      {/* Top Connection Bar */}
      <form
        onSubmit={handleUrlSubmit}
        className="flex items-center gap-2 p-2 bg-[#161b22] border-b border-[#30363d]"
      >
        <div className="flex items-center px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-l-md font-mono font-bold text-sky-400 text-xs">
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
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-r-md px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}

          {status === 'connected' || status === 'connecting' ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium shadow-sm transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-sm transition-colors"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </form>

      {/* Main Split Workbench: Composer on Top, Messages on Bottom */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#30363d]">
        {/* Message Composer (Left / Top) */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-[#161b22] overflow-hidden">
          <div className="flex items-center justify-between p-2.5 border-b border-[#30363d] bg-[#0d1117]">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Message Composer
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrettify}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10"
                title="Format JSON"
              >
                <Sparkles className="w-3 h-3" />
                <span>Format</span>
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={status !== 'connected'}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-white font-medium shadow-sm transition-colors ${
                  status === 'connected'
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 bg-[#0d1117] overflow-hidden">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Enter text or JSON payload to send..."
              spellCheck={false}
              className="w-full h-full p-2 font-mono text-xs bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed"
            />
          </div>

          {/* Quick preset payloads */}
          <div className="p-2 border-t border-[#30363d] bg-[#161b22] flex items-center gap-2 overflow-x-auto">
            <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0">
              Samples:
            </span>
            <button
              onClick={() =>
                setMessageInput(
                  JSON.stringify({ type: 'ping', timestamp: Date.now() }, null, 2)
                )
              }
              className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-slate-300 border border-[#30363d]/50 shrink-0 font-mono text-[10px]"
            >
              Ping Frame
            </button>
            <button
              onClick={() =>
                setMessageInput(
                  JSON.stringify(
                    { action: 'subscribe', channel: 'live_updates', id: 1 },
                    null,
                    2
                  )
                )
              }
              className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-slate-300 border border-[#30363d]/50 shrink-0 font-mono text-[10px]"
            >
              Subscribe Action
            </button>
          </div>
        </div>

        {/* Live Stream / Messages Log (Right / Bottom) */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full bg-[#0d1117] overflow-hidden">
          <div className="flex items-center justify-between p-2.5 border-b border-[#30363d] bg-[#161b22]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Messages Stream ({messages.length})
              </span>
              <div className="flex items-center rounded bg-[#0d1117] border border-[#30363d] p-0.5 text-[10px]">
                {(['all', 'sent', 'received'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      filter === mode
                        ? 'bg-sky-500/20 text-sky-400 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {messages.length > 0 && (
              <button
                onClick={onClearMessages}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
                title="Clear message stream"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <Radio className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
                <p>No messages in stream.</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Connect to a WebSocket server to view real-time bidirectional traffic.
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
                      className="p-2 rounded bg-[#161b22]/40 border border-[#30363d]/40 flex items-center justify-between text-slate-400 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                        <span>{msg.data}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-md border text-xs group transition-colors ${
                      isSent
                        ? 'bg-sky-500/5 border-sky-500/20'
                        : 'bg-emerald-500/5 border-emerald-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {isSent ? (
                          <span className="flex items-center gap-1 font-mono font-bold text-[10px] text-sky-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            SENT
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-400">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            RECEIVED
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatBytes(msg.sizeBytes)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.data)}
                          className="text-slate-500 hover:text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap select-text leading-relaxed">
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
