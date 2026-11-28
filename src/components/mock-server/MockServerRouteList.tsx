import React from 'react';
import { MockServer, MockRoute } from '../../types/server';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Search, Plus, Trash2, Globe, Sparkles, Layers } from 'lucide-react';

interface MockServerRouteListProps {
  server: MockServer;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onAddRoute: () => void;
  onDeleteRoute: (routeId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MockServerRouteList: React.FC<MockServerRouteListProps> = ({
  server,
  selectedRouteId,
  onSelectRoute,
  onAddRoute,
  onDeleteRoute,
  searchQuery,
  onSearchChange,
}) => {
  const isRunning = server.status === 'running';

  const filteredRoutes = server.routes.filter(
    (route) =>
      route.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMethodBadgeVariant = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'get';
      case 'POST':
        return 'post';
      case 'PUT':
        return 'put';
      case 'PATCH':
        return 'patch';
      case 'DELETE':
        return 'delete';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="w-72 bg-[#1a1b1e] border-r border-border flex flex-col shrink-0 select-none">
      {/* Server Status Header Box */}
      <div className="p-3 border-b border-border bg-[#141517]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-semibold text-foreground">
              {isRunning ? 'Server Active' : 'Server Stopped'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {server.routes.length} routes
          </span>
        </div>

        {isRunning && (
          <div className="mt-2 text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">http://localhost:{server.port}</span>
          </div>
        )}
      </div>

      {/* Routes Search & Add Button */}
      <div className="p-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search routes..."
            className="pl-7 h-7 text-xs bg-[#141517]"
          />
        </div>
        <Button
          variant="amber"
          size="sm"
          onClick={onAddRoute}
          title="Add New Route"
          className="h-7 px-2"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Routes List */}
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {filteredRoutes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="w-6 h-6 mx-auto text-muted-foreground/40" />
              <p>No routes found</p>
              <Button variant="outline" size="sm" onClick={onAddRoute} className="text-xs">
                Create First Route
              </Button>
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#222225] border border-border text-foreground'
                      : 'hover:bg-[#202226] text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant={getMethodBadgeVariant(route.method) as any}
                      className="px-1.5 py-0 text-[9px] font-bold shrink-0"
                    >
                      {route.method}
                    </Badge>
                    <span className="font-mono text-xs truncate">{route.path}</span>
                    {route.responseMode === 'dynamic' && (
                      <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRoute(route.id);
                    }}
                    title="Delete Route"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
