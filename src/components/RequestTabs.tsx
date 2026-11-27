import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TabItem, RequestProtocol } from '../types';
import { getMethodColor } from '../utils/http';
import { Plus, X, Globe, Radio, ChevronDown, Box } from 'lucide-react';

interface RequestTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: (protocol?: RequestProtocol) => void;
  activeCollectionName?: string;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  activeCollectionName,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192; // 12rem / w-48
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, left),
      });
      setIsMenuOpen(true);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isMenuOpen]);

  return (
    <div className="flex items-end bg-[#1a1a1a] border-b border-[#333333] h-9 px-4 overflow-x-auto select-none no-scrollbar">
      <div className="flex items-end h-full gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isWs = tab.protocol === 'websocket';
          const methodColor = getMethodColor(tab.request.method);

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1 text-xs cursor-pointer transition-all max-w-[210px] shrink-0 ${
                isActive
                  ? 'bg-[#1a1a1a] border-t border-l border-r border-[#333333] border-b border-[#1a1a1a] -mb-px text-[#ffffff] font-medium z-10 shadow-xs h-[32px] rounded-t-md'
                  : 'bg-[#26292b] hover:bg-[#2f3235] text-[#999999] hover:text-[#cccccc] h-[28px] mb-1 rounded-md'
              }`}
            >
              {isWs ? (
                <span className="font-mono font-bold text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  WS
                </span>
              ) : (
                <span className={`font-mono font-bold text-[10px] shrink-0 ${methodColor.text}`}>
                  {tab.request.method}
                </span>
              )}

              <span className="truncate flex-1 font-sans text-xs">
                {isWs
                  ? tab.wsUrl?.replace(/^wss?:\/\//, '') || 'WebSocket'
                  : tab.title || tab.request.name || tab.request.url || 'Untitled'}
              </span>

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#d99b26] shrink-0" title="Unsaved changes" />
              )}

              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded text-[#777777] hover:text-white hover:bg-[#333333] transition-opacity ${
                    isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close tab (⌘W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tab Button & Menu Trigger */}
      <div className="flex items-center ml-1 mb-1 shrink-0">
        <button
          type="button"
          onClick={() => onNewTab('http')}
          className="w-7 h-7 flex items-center justify-center text-[#999999] hover:text-white rounded hover:bg-[#26292b] transition-colors cursor-pointer"
          title="New HTTP request (⌘T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMenu}
          className={`p-1 rounded transition-colors cursor-pointer ${
            isMenuOpen
              ? 'text-white bg-[#26292b]'
              : 'text-[#999999] hover:text-white hover:bg-[#26292b]'
          }`}
          title="Choose request type (HTTP or WebSocket)"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Dropdown Menu via Portal to prevent overflow clipping */}
      {isMenuOpen && menuPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            zIndex: 9999,
          }}
          className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onNewTab('http');
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>HTTP Request</span>
            </div>
            <span className="text-[10px] text-[#777777] font-mono">⌘T</span>
          </button>
          <button
            onClick={() => {
              onNewTab('websocket');
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebSocket (WSS)</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
