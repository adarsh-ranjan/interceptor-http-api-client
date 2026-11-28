import React from 'react';
import { MockRoute } from '../../types/server';
import { Plus, Search, Trash2 } from 'lucide-react';
import { getMockMethodBadgeClass } from './mockBadgeUtils';

interface MockRoutesSidebarProps {
  routes: MockRoute[];
  selectedRouteId: string;
  routeSearch: string;
  onRouteSearchChange: (value: string) => void;
  onSelectRoute: (routeId: string) => void;
  onCreateRoute: () => void;
  onToggleRoute: (routeId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteRoute: (routeId: string, e: React.MouseEvent) => void;
}

export const MockRoutesSidebar: React.FC<MockRoutesSidebarProps> = ({
  routes,
  selectedRouteId,
  routeSearch,
  onRouteSearchChange,
  onSelectRoute,
  onCreateRoute,
  onToggleRoute,
  onDeleteRoute,
}) => {
  return (
    <div className="w-72 border-r border-[#333333] flex flex-col bg-[#1a1a1a] shrink-0">
      <div className="p-2 border-b border-[#333333] flex items-center justify-between gap-2 bg-[#222224]/50">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-[#666666] absolute left-2 top-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter routes..."
            value={routeSearch}
            onChange={(e) => onRouteSearchChange(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded pl-7 pr-2 py-0.5 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#d99b26]"
          />
        </div>
        <button
          type="button"
          onClick={onCreateRoute}
          className="flex items-center gap-1 px-2 py-1 bg-[#d99b26]/10 text-[#d99b26] border border-[#d99b26]/30 hover:bg-[#d99b26]/20 rounded text-xs font-medium transition-colors"
          title="Add Route"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors border group ${
                isSelected
                  ? 'bg-[#26292b] border-[#d99b26]/40 text-white'
                  : 'border-transparent hover:bg-[#222224] text-[#cccccc]'
              } ${!route.enabled ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${getMockMethodBadgeClass(
                    route.method
                  )}`}
                >
                  {route.method}
                </span>

                <div className="flex flex-col truncate">
                  <span className="font-mono text-xs truncate font-medium text-white">
                    {route.path}
                  </span>
                  <span className="text-[10px] text-[#777777] truncate">{route.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {route.hitCount > 0 && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#333333] text-[#888888] font-mono">
                    {route.hitCount}
                  </span>
                )}

                <input
                  type="checkbox"
                  checked={route.enabled}
                  onChange={(e) => onToggleRoute(route.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-[#d99b26] cursor-pointer"
                  title={route.enabled ? 'Route enabled' : 'Route disabled'}
                />

                <button
                  type="button"
                  onClick={(e) => onDeleteRoute(route.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[#666666] hover:text-rose-400 transition-opacity"
                  title="Delete route"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {routes.length === 0 && (
          <div className="text-center py-8 text-xs text-[#666666]">No routes match search.</div>
        )}
      </div>
    </div>
  );
};
