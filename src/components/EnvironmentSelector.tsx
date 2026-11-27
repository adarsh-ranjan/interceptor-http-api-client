import React, { useState, useRef, useEffect } from 'react';
import { Environment } from '../types';
import { Globe, Settings, ChevronDown, Check } from 'lucide-react';

interface EnvironmentSelectorProps {
  environments: Environment[];
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  onOpenManageModal: () => void;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  environments,
  activeEnvId,
  onSelectEnv,
  onOpenManageModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1 bg-[#222224] border border-[#333333] rounded-md p-0.5">
        {/* Environment Picker Button (Bruno style) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#cccccc] hover:text-white rounded hover:bg-[#2e3235] transition-colors cursor-pointer"
          title="Select active environment"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeEnv ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-[#666666]'
            }`}
          />
          <span className="font-medium max-w-[130px] truncate">
            {activeEnv ? activeEnv.name : 'No Environment'}
          </span>
          <ChevronDown className="w-3 h-3 text-[#777777]" />
        </button>

        {/* Manage Settings Gear Button */}
        <button
          onClick={onOpenManageModal}
          className="p-1 text-[#888888] hover:text-[#d99b26] rounded hover:bg-[#2e3235] transition-colors cursor-pointer"
          title="Manage environments & variables"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#222224] border border-[#333333] rounded-md shadow-2xl z-30 py-1 text-xs select-none">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#888888] border-b border-[#333333]">
            Active Environment
          </div>

          <button
            onClick={() => {
              onSelectEnv(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#666666]" />
              <span>No Environment</span>
            </div>
            {!activeEnv && <Check className="w-3.5 h-3.5 text-[#d99b26]" />}
          </button>

          {environments.map((env) => {
            const isSelected = env.id === activeEnvId;
            return (
              <button
                key={env.id}
                onClick={() => {
                  onSelectEnv(env.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{env.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0 ml-1" />}
              </button>
            );
          })}

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenManageModal();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#d99b26] hover:bg-[#26292b] text-left transition-colors font-medium cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Environments...</span>
          </button>
        </div>
      )}
    </div>
  );
};
