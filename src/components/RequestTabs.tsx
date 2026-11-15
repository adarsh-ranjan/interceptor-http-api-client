import React, { useState, useRef, useEffect } from 'react';
import { TabItem, RequestProtocol } from '../types';
import { getMethodColor } from '../utils/http';
import { Plus, X, Globe, Radio, ChevronDown } from 'lucide-react';

interface RequestTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: (protocol?: RequestProtocol) => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center bg-[#0d1117] border-b border-[#30363d] px-2 overflow-x-auto select-none no-scrollbar">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isWs = tab.protocol === 'websocket';
          const methodColor = getMethodColor(tab.request.method);

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-t-2 transition-all max-w-[220px] ${
                isActive
                  ? 'bg-[#161b22] border-sky-500 text-slate-100'
                  : 'border-transparent text-slate-400 hover:bg-[#161b22]/50 hover:text-slate-300'
              }`}
            >
              {isWs ? (
                <span className="font-mono font-bold text-[10px] text-emerald-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  WS
                </span>
              ) : (
                <span className={`font-mono font-bold text-[10px] ${methodColor.text}`}>
                  {tab.request.method}
                </span>
              )}

              <span className="truncate flex-1 font-mono text-[11px]">
                {isWs
                  ? tab.wsUrl?.replace(/^wss?:\/\//, '') || 'WebSocket'
                  : tab.title || tab.request.name || tab.request.url || 'Untitled'}
              </span>

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
              )}

              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-[#21262d] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tab Button & Menu */}
      <div className="relative ml-1" ref={menuRef}>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onNewTab('http')}
            className="p-1.5 text-slate-400 hover:text-white rounded-l hover:bg-[#161b22] transition-colors"
            title="New HTTP request (⌘T)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-slate-400 hover:text-white rounded-r hover:bg-[#161b22] transition-colors"
            title="Choose request type"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute left-0 top-full mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-30 py-1 text-xs">
            <button
              onClick={() => {
                onNewTab('http');
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>HTTP Request</span>
            </button>
            <button
              onClick={() => {
                onNewTab('websocket');
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>WebSocket (WSS)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
