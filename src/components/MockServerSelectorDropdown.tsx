import React, { useRef, useState } from 'react';
import { MockServer, ServerStatus } from '../types/server';
import { Check, ChevronDown, Plus, Radio } from 'lucide-react';
import { PortalMenu } from './PortalMenu';

interface MockServerSelectorDropdownProps {
  servers: MockServer[];
  selectedServerId: string;
  onSelectServer: (id: string) => void;
  onCreateServer?: () => void;
  className?: string;
}

function getServerStatusDotClass(status: ServerStatus): string {
  if (status === 'running') {
    return 'bg-emerald-400 shadow-xs shadow-emerald-400/50 animate-pulse';
  }
  if (status === 'error') {
    return 'bg-rose-400';
  }
  return 'bg-[#666666]';
}

export const MockServerSelectorDropdown: React.FC<MockServerSelectorDropdownProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
  onCreateServer,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentServer = servers.find((s) => s.id === selectedServerId) || servers[0];

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 260;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      if (left < 10) left = 10;

      setMenuPos({ top: rect.bottom + 4, left });
      setIsOpen(true);
    }
  };

  if (!currentServer) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        className={`flex items-center gap-2 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] hover:border-[#444444] rounded text-xs transition-colors cursor-pointer select-none focus:outline-none focus:border-[#d99b26] ${className}`}
        title="Switch active mock server"
      >
        <Radio className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
        <span className={`w-2 h-2 rounded-full shrink-0 ${getServerStatusDotClass(currentServer.status)}`} />
        <span className="font-semibold text-white truncate max-w-[140px]">
          {currentServer.name}
        </span>
        <span className="text-[#888888] font-mono text-[11px] shrink-0">
          (Port {currentServer.port})
        </span>
        <ChevronDown className="w-3 h-3 text-[#777777] shrink-0 ml-0.5" />
      </button>

      <PortalMenu
        isOpen={isOpen}
        position={menuPos}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        className="w-64 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#777777] border-b border-[#333333]/80 flex items-center justify-between">
          <span>Mock Servers ({servers.length})</span>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {servers.map((s) => {
            const isSelected = s.id === currentServer.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectServer(s.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#26292b] text-white font-medium'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getServerStatusDotClass(s.status)}`} />
                  <div className="flex flex-col truncate min-w-0">
                    <span className="truncate font-medium text-white">{s.name}</span>
                    <span className="font-mono text-[10px] text-[#888888]">
                      Port {s.port} • {s.routes.length} route{s.routes.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>

        {onCreateServer && (
          <>
            <div className="my-1 border-t border-[#333333]/80" />
            <button
              type="button"
              onClick={() => {
                onCreateServer();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#888888] hover:text-[#d99b26] hover:bg-[#26292b] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Mock Server</span>
            </button>
          </>
        )}
      </PortalMenu>
    </>
  );
};
