import React, { useState } from 'react';
import { HistoryItem, HttpRequest, Collection, Environment } from '../types';
import { CollectionsView } from './CollectionsView';
import { getMethodColor, getStatusColor } from '../utils/http';
import { History, FolderTree, Trash2, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface SidebarProps {
  history: HistoryItem[];
  collections: Collection[];
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onClearHistory: () => void;
  onUpdateCollections: (collections: Collection[]) => void;
  onNewRequestInCollection: (collectionId: string, folderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  environments?: Environment[];
  activeEnvId?: string | null;
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
  isCollapsed,
  onToggleCollapse,
  environments,
  activeEnvId,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-2.5 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#21262d] transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveTab('collections');
            }}
            className="p-2 text-slate-400 hover:text-sky-400 rounded hover:bg-[#21262d]"
            title="Collections"
          >
            <FolderTree className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveTab('history');
            }}
            className="p-2 text-slate-400 hover:text-sky-400 rounded hover:bg-[#21262d]"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-[#161b22] border-r border-[#30363d] flex flex-col h-full text-xs">
      {/* Sidebar Tabs & Collapse Button Header */}
      <div className="flex items-center justify-between border-b border-[#30363d] bg-[#0d1117] px-1">
        <div className="flex items-center flex-1">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'collections'
                ? 'border-sky-500 text-sky-400 bg-[#161b22]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Collections</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-400 bg-[#161b22]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-[#21262d] transition-colors ml-1"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'collections' ? (
          <CollectionsView
            collections={collections}
            onSelectRequest={onSelectRequest}
            onUpdateCollections={onUpdateCollections}
            onNewRequestInCollection={onNewRequestInCollection}
            onRunCollection={onRunCollection}
            environments={environments}
            activeEnvId={activeEnvId}
          />
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-[#30363d]/50 p-2">
            <div className="flex items-center justify-between pb-2 mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Recent Requests
              </span>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-6 text-center">
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
                      className="w-full flex items-center gap-1.5 p-1.5 rounded hover:bg-[#21262d] transition-colors text-left group"
                    >
                      <span
                        className={`font-mono font-bold text-[9px] px-1 py-0.2 rounded border ${methodColor.bg} ${methodColor.text} ${methodColor.border}`}
                      >
                        {item.method}
                      </span>
                      <span className="truncate text-slate-300 group-hover:text-white flex-1 font-mono text-[11px]">
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
        )}
      </div>

      {/* Bottom Presets Bar */}
      <div className="p-2 border-t border-[#30363d] bg-[#0d1117]/60">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1 px-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Quick Starters</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onSelectRequest(preset.request)}
              className="px-1.5 py-1 text-[10px] rounded bg-[#161b22] hover:bg-[#21262d] text-slate-300 hover:text-white truncate border border-[#30363d]/50 text-center"
              title={preset.request.url}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
