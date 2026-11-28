import React from 'react';
import { MockRoute } from '../../types/server';
import { Search, Plus } from 'lucide-react';

interface MockServerRouteListProps {
  routes: MockRoute[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
  onAddRoute: () => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  OPTIONS: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  HEAD: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
};

export const MockServerRouteList: React.FC<MockServerRouteListProps> = ({
  routes,
  selectedRouteId,
  onSelectRouteId,
  onAddRoute,
  search,
  onSearchChange,
}) => {
  return (
    <div className="w-64 border-r border-[#333333] flex flex-col bg-[#1a1a1a] select-none shrink-0">
      {/* Header with Search & Add Button */}
      <div className="p-2 border-b border-[#333333] flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search routes..."
            className="w-full bg-[#222224] border border-[#333333] rounded pl-7 pr-2 py-1 text-xs text-[#cccccc] placeholder:text-[#666666] outline-none focus:border-[#d99b26]"
          />
        </div>
        <button
          onClick={onAddRoute}
          className="p-1 rounded bg-[#222224] hover:bg-[#2d2d30] border border-[#333333] text-[#cccccc] hover:text-white transition-colors cursor-pointer"
          title="Add New Mock Route"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Routes List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {routes.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#666666]">
            No routes found
          </div>
        ) : (
          routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const methodColor = METHOD_COLORS[route.method] || 'text-zinc-400 border-zinc-700';

            return (
              <div
                key={route.id}
                onClick={() => onSelectRouteId(route.id)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-[#26292b] border border-[#d99b26]/50 text-white font-medium'
                    : 'hover:bg-[#222224] text-[#aaaaaa] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold border ${methodColor}`}
                  >
                    {route.method}
                  </span>
                  <span className="truncate font-mono text-[11px]">
                    {route.path}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-[#666666]">
                  {route.responseMode === 'dynamic' ? (
                    <span className="text-purple-400" title="Dynamic JS script handler">
                      JS
                    </span>
                  ) : (
                    <span>{route.statusCode}</span>
                  )}
                  {Boolean(route.hitCount) && (
                    <span className="px-1 py-0.2 rounded bg-[#111112] text-[#888888]">
                      {route.hitCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
