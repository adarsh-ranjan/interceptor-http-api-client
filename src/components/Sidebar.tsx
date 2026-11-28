import React, { useState } from 'react';
import { HistoryItem, HttpRequest, Collection, Environment } from '../types';
import { CollectionsView } from './CollectionsView';
import { getMethodColor, getStatusColor } from '../utils/http';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { History, FolderTree, Trash2, FileCode, Server, Plus, Clock } from 'lucide-react';

interface SidebarProps {
  history: HistoryItem[];
  collections: Collection[];
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onClearHistory: () => void;
  onUpdateCollections: (collections: Collection[]) => void;
  onNewRequestInCollection: (collectionId: string, folderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  environments?: Environment[];
  activeEnvId?: string | null;
  activeItemId?: string | null;
  width?: number;
  onOpenMockServers?: () => void;
  activeSection?: 'requests' | 'mock-servers';
  runningMockServerCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  collections,
  onSelectRequest,
  onClearHistory,
  onUpdateCollections,
  onNewRequestInCollection,
  onRunCollection,
  environments,
  activeEnvId,
  activeItemId,
  width = 260,
  onOpenMockServers,
  activeSection = 'requests',
  runningMockServerCount = 0,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <aside
      style={{ width: `${width}px` }}
      className="shrink-0 bg-[#141517] border-r border-border flex flex-col h-full text-xs select-none"
    >
      {/* Collections or History Container */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#141517]">
        {showHistory ? (
          <div className="flex flex-col h-full bg-[#141517]">
            <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-[#1a1b1e]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>History ({history.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearHistory}
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-rose-400"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="h-6 px-1.5 text-[10px] text-primary hover:underline"
                >
                  Collections
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              {history.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-8 text-center">
                  Executed requests will appear here.
                </p>
              ) : (
                <div className="space-y-1">
                  {history.map((item) => {
                    const methodColor = getMethodColor(item.method);
                    const statusColor = getStatusColor(item.status);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectRequest(item.request)}
                        className="w-full flex items-center gap-1.5 p-1.5 rounded-md hover:bg-[#202226] transition-colors text-left group cursor-pointer"
                      >
                        <span
                          className={`font-mono font-bold text-[9px] px-1 py-0.2 rounded border ${methodColor.bg} ${methodColor.text} ${methodColor.border}`}
                        >
                          {item.method}
                        </span>
                        <span className="truncate text-muted-foreground group-hover:text-foreground flex-1 font-mono text-[11px]">
                          {item.url.replace(/^https?:\/\//, '')}
                        </span>
                        {item.status > 0 && (
                          <span
                            className={`font-mono text-[9px] px-1 py-0.2 rounded ${statusColor.text}`}
                          >
                            {item.status}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <CollectionsView
            collections={collections}
            onSelectRequest={onSelectRequest}
            onUpdateCollections={onUpdateCollections}
            onNewRequestInCollection={onNewRequestInCollection}
            onRunCollection={onRunCollection}
            environments={environments}
            activeEnvId={activeEnvId}
            activeItemId={activeItemId}
          />
        )}
      </div>

      {/* Bottom Sidebar Sections: API Specs & Mock Servers */}
      <div className="border-t border-border bg-[#1a1b1e] text-muted-foreground">
        <div className="flex items-center justify-between px-3 py-2 text-xs hover:text-foreground hover:bg-[#202226] cursor-pointer transition-colors group">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
            <span>API Specs</span>
          </div>
          <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        </div>

        <Separator />

        <div
          onClick={onOpenMockServers}
          className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors group ${
            activeSection === 'mock-servers'
              ? 'bg-[#26282c] text-foreground font-medium'
              : 'hover:text-foreground hover:bg-[#202226]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server
              className={`w-3.5 h-3.5 ${
                activeSection === 'mock-servers' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              }`}
            />
            <span>Mock Servers</span>
            {runningMockServerCount > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"
                title={`${runningMockServerCount} server(s) running`}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMockServers?.();
            }}
            className="h-5 w-5 text-muted-foreground hover:text-primary"
            title="Open Mock Server Workbench"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Separator />

        <div
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[#202226] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-primary" />
            <span>{showHistory ? 'View Collections' : `Recent History (${history.length})`}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
