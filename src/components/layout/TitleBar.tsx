import React from 'react';
import { ChevronDown, Columns2, PanelLeft, RotateCcw, Rows2 } from 'lucide-react';
import { WorkbenchLayout } from '../../hooks/useLayoutPreferences';
import { InterceptorLogo } from '../InterceptorLogo';

interface TitleBarProps {
  isMaximized: boolean;
  isSidebarCollapsed: boolean;
  workbenchLayout: WorkbenchLayout;
  onToggleSidebar: () => void;
  onSetWorkbenchLayout: (layout: WorkbenchLayout) => void;
  onResetLayout: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isMaximized,
  isSidebarCollapsed,
  workbenchLayout,
  onToggleSidebar,
  onSetWorkbenchLayout,
  onResetLayout,
}) => {
  return (
    <header
      className="relative h-9 bg-[#1a1a1a] flex items-center justify-between px-3 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div
        className={`flex items-center gap-2.5 transition-all duration-150 ${
          isMaximized ? 'pl-2' : 'pl-20'
        }`}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#26292b] rounded cursor-pointer transition-colors font-medium select-none">
          <span>My Workspace</span>
          <ChevronDown className="w-3 h-3 text-[#777777]" />
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none hidden md:flex items-center gap-1.5">
        <InterceptorLogo size={16} />
        <span className="font-semibold text-xs tracking-wide text-[#cccccc] font-sans">
          Interceptor
        </span>
      </div>

      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-1 bg-[#222224] p-0.5 rounded border border-[#333333]">
          <button
            onClick={onToggleSidebar}
            className={`p-1 rounded transition-colors cursor-pointer ${
              !isSidebarCollapsed
                ? 'bg-[#d99b26]/20 text-[#d99b26]'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
            }`}
            title={isSidebarCollapsed ? 'Show Sidebar (⌘B)' : 'Hide Sidebar (⌘B)'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-[#333333] mx-0.5" />
          <button
            onClick={() => onSetWorkbenchLayout('horizontal')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              workbenchLayout === 'horizontal'
                ? 'bg-[#d99b26] text-white shadow-xs'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
            }`}
            title="3 Columns Layout (Side-by-side Request & Response)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSetWorkbenchLayout('vertical')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              workbenchLayout === 'vertical'
                ? 'bg-[#d99b26] text-white shadow-xs'
                : 'text-[#888888] hover:text-white hover:bg-[#2e3235]'
            }`}
            title="Stacked Layout (Request Top / Response Bottom)"
          >
            <Rows2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-[#333333] mx-0.5" />
          <button
            onClick={onResetLayout}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#2e3235] transition-colors cursor-pointer"
            title="Reset Layout & Column Widths (50/50)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
