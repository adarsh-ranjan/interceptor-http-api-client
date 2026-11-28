import React, { useRef, useState } from 'react';
import { RequestProtocol, TabItem } from '../types';
import { getMethodColor } from '../utils/http';
import { useTabScroll } from '../hooks/useTabScroll';
import { ChevronDown, ChevronLeft, ChevronRight, Globe, Plus, Radio, X } from 'lucide-react';
import { PortalMenu } from './PortalMenu';

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
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    isOverflowing,
    updateScrollState,
    scrollTabs,
    handleWheel,
  } = useTabScroll({ activeTabId, itemCount: tabs.length });

  const toggleMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192;
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

  return (
    <div
      className={`flex items-end bg-[#1a1a1a] border-b border-[#333333] h-9 select-none shrink-0 ${
        isOverflowing ? 'px-1.5 gap-1' : 'px-4'
      }`}
    >
      {isOverflowing && (
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          disabled={!canScrollLeft}
          className={`w-6 h-7 mb-1 flex items-center justify-center rounded shrink-0 transition-colors ${
            canScrollLeft
              ? 'text-[#999999] hover:text-white hover:bg-[#26292b] cursor-pointer'
              : 'text-[#555555] opacity-40 cursor-not-allowed'
          }`}
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={updateScrollState}
        onWheel={handleWheel}
        className="flex items-end h-9 -mb-px gap-1 overflow-x-auto no-scrollbar min-w-0"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isWs = tab.protocol === 'websocket';
          const methodColor = getMethodColor(tab.request.method);

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1 text-xs cursor-pointer transition-all max-w-[210px] shrink-0 ${
                isActive
                  ? 'bg-[#1a1a1a] border-t border-l border-r border-[#333333] border-b border-[#1a1a1a] text-[#ffffff] font-medium z-10 shadow-xs h-[33px] rounded-t-md'
                  : 'bg-[#26292b] hover:bg-[#2f3235] text-[#999999] hover:text-[#cccccc] h-[28px] mb-[5px] rounded-md'
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
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#d99b26] shrink-0"
                  title="Unsaved changes"
                />
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

      {isOverflowing && (
        <button
          type="button"
          onClick={() => scrollTabs('right')}
          disabled={!canScrollRight}
          className={`w-6 h-7 mb-1 ml-auto flex items-center justify-center rounded shrink-0 transition-colors ${
            canScrollRight
              ? 'text-[#999999] hover:text-white hover:bg-[#26292b] cursor-pointer'
              : 'text-[#555555] opacity-40 cursor-not-allowed'
          }`}
          title="Scroll tabs right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      <PortalMenu
        isOpen={isMenuOpen}
        position={menuPos}
        onClose={() => setIsMenuOpen(false)}
        triggerRef={buttonRef}
        className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
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
      </PortalMenu>
    </div>
  );
};
