import React from 'react';
import { TabItem, RequestProtocol } from '../types';
import { getMethodColor } from '../utils/http';
import { Plus, X, Globe, Radio, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  return (
    <div className="flex items-end bg-card border-b border-border h-9 px-4 overflow-x-auto select-none no-scrollbar">
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
                  ? 'bg-card border-t border-l border-r border-border border-b border-card -mb-px text-foreground font-medium z-10 shadow-xs h-[32px] rounded-t-md'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground h-[28px] mb-1 rounded-md'
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
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
              )}

              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity ${
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
      <div className="flex items-center ml-1 mb-1 shrink-0 gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onNewTab('http')}
          className="text-muted-foreground hover:text-foreground"
          title="New HTTP request (⌘T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground h-6 w-5 px-0"
              title="Choose request type (HTTP or WebSocket)"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onNewTab('http')} className="gap-2">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span className="flex-1">HTTP Request</span>
              <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewTab('websocket')} className="gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="flex-1">WebSocket (WSS)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
