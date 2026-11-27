import React, { useState } from 'react';
import { HistoryItem, HttpRequest, Collection, Environment } from '../types';
import { CollectionsView } from './CollectionsView';
import { getMethodColor, getStatusColor } from '../utils/http';
import { History, FolderTree, Trash2, Zap, FileCode, Server, Plus, Clock } from 'lucide-react';

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
}

const PRESETS: { name: string; request: HttpRequest }[] = [
  {
    name: 'Get All Posts',
    request: {
      id: 'preset-1',
      name: 'Get All Posts',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts?_limit=5',
      params: [{ id: 'p1', key: '_limit', value: '5', enabled: true }],
      headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
      bodyType: 'none',
      bodyContent: '',
    },
  },
  {
    name: 'Create Post',
    request: {
      id: 'preset-2',
      name: 'Create Post',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      params: [],
      headers: [
        { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      bodyType: 'json',
      bodyContent: JSON.stringify(
        {
          title: 'Interceptor Test Request',
          body: 'Testing cross-platform desktop API client with Electron & React',
          userId: 1,
        },
        null,
        2
      ),
    },
  },
  {
    name: 'HttpBin Echo',
    request: {
      id: 'preset-3',
      name: 'HttpBin Echo',
      method: 'POST',
      url: 'https://httpbin.org/post',
      params: [],
      headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
      bodyType: 'json',
      bodyContent: JSON.stringify({ message: 'Hello from Interceptor!' }, null, 2),
    },
  },
];

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
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <aside
      style={{ width: `${width}px` }}
      className="shrink-0 bg-[#1a1a1a] border-r border-[#333333] flex flex-col h-full text-xs select-none"
    >
      {/* Collections Content (Header is inside CollectionsView matching Bruno Image 4) */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
        {showHistory ? (
          <div className="flex flex-col h-full bg-[#1a1a1a]">
            <div className="flex items-center justify-between px-3 h-9 border-b border-[#333333] bg-[#1a1a1a]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#cccccc]">
                <Clock className="w-3.5 h-3.5 text-[#d99b26]" />
                <span>History ({history.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="text-[10px] text-[#777777] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-[10px] text-[#d99b26] hover:underline cursor-pointer"
                >
                  Collections
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#333333]/50 p-2">
              {history.length === 0 ? (
                <p className="text-[11px] text-[#777777] italic py-6 text-center">
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
                        className="w-full flex items-center gap-1.5 p-1.5 rounded hover:bg-[#222224] transition-colors text-left group cursor-pointer"
                      >
                        <span
                          className={`font-mono font-bold text-[9px] px-1 py-0.2 rounded border ${methodColor.bg} ${methodColor.text} ${methodColor.border}`}
                        >
                          {item.method}
                        </span>
                        <span className="truncate text-[#cccccc] group-hover:text-white flex-1 font-mono text-[11px]">
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
            </div>
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

      {/* Bottom Bruno Sidebar Sections: API Specs & Mock Servers (matches Image 4) */}
      <div className="border-t border-[#333333] bg-[#1a1a1a] text-[#888888]">
        <div className="flex items-center justify-between px-3 py-2 text-xs hover:text-[#cccccc] hover:bg-[#222224] cursor-pointer transition-colors group">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-[#777777] group-hover:text-[#cccccc]" />
            <span>API Specs</span>
          </div>
          <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-xs hover:text-[#cccccc] hover:bg-[#222224] cursor-pointer transition-colors group border-t border-[#333333]/50">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#777777] group-hover:text-[#cccccc]" />
            <span>Mock Servers</span>
          </div>
          <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        </div>
        <div
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between px-3 py-1.5 text-[11px] text-[#777777] hover:text-[#cccccc] hover:bg-[#222224] cursor-pointer transition-colors border-t border-[#333333]/50"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[#d99b26]" />
            <span>{showHistory ? 'View Collections' : `Recent History (${history.length})`}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

