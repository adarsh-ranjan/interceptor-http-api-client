import React from 'react';
import { InterceptorLogo } from '../InterceptorLogo';
import {
  ChevronDown,
  Columns2,
  Rows2,
  RotateCcw,
  PanelLeft,
} from 'lucide-react';
import { Button } from '../ui/button';

interface AppHeaderProps {
  isMaximized: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  workbenchLayout: 'horizontal' | 'vertical';
  onSetWorkbenchLayout: (layout: 'horizontal' | 'vertical') => void;
  onResetLayout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isMaximized,
  isSidebarCollapsed,
  onToggleSidebar,
  workbenchLayout,
  onSetWorkbenchLayout,
  onResetLayout,
}) => {
  return (
    <header
      className="relative h-9 bg-card border-b border-border flex items-center justify-between px-3 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Left: Workspace Selector */}
      <div
        className={`flex items-center gap-2.5 transition-all duration-150 ${isMaximized ? 'pl-2' : 'pl-20'}`}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-foreground hover:bg-muted rounded cursor-pointer transition-colors font-medium select-none">
          <span>My Workspace</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      {/* Center: Interceptor App Logo Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex items-center gap-1.5">
        <InterceptorLogo size={16} />
        <span className="font-semibold text-xs tracking-wide text-foreground font-sans">Interceptor</span>
      </div>

      {/* Right: Layout Controls */}
      <div
        className="flex items-center gap-2.5"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleSidebar}
            className={`h-6 w-6 p-0 rounded ${
              !isSidebarCollapsed
                ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 hover:text-amber-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={isSidebarCollapsed ? 'Show Sidebar (⌘B)' : 'Hide Sidebar (⌘B)'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-3.5 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSetWorkbenchLayout('horizontal')}
            className={`h-6 w-6 p-0 rounded ${
              workbenchLayout === 'horizontal'
                ? 'bg-amber-500 text-primary-foreground hover:bg-amber-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="3 Columns Layout (Side-by-side Request & Response)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSetWorkbenchLayout('vertical')}
            className={`h-6 w-6 p-0 rounded ${
              workbenchLayout === 'vertical'
                ? 'bg-amber-500 text-primary-foreground hover:bg-amber-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Stacked Layout (Request Top / Response Bottom)"
          >
            <Rows2 className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-3.5 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onResetLayout}
            className="h-6 w-6 p-0 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Reset Layout & Column Widths (50/50)"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </header>
  );
};
