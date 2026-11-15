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
      <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-md p-0.5">
        {/* Environment Picker Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded hover:bg-[#21262d] transition-colors"
          title="Select active environment"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeEnv ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-slate-500'
            }`}
          />
          <span className="font-medium max-w-[130px] truncate">
            {activeEnv ? activeEnv.name : 'No Environment'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Manage Settings Gear Button */}
        <button
          onClick={onOpenManageModal}
          className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-[#21262d] transition-colors"
          title="Manage environments & variables"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-30 py-1 text-xs">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-[#30363d]/50">
            Active Environment
          </div>

          <button
            onClick={() => {
              onSelectEnv(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>No Environment</span>
            </div>
            {!activeEnv && <Check className="w-3.5 h-3.5 text-sky-400" />}
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left transition-colors"
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{env.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
              </button>
            );
          })}

          <div className="border-t border-[#30363d] my-1" />

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenManageModal();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sky-400 hover:bg-[#21262d] text-left transition-colors font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Environments...</span>
          </button>
        </div>
      )}
    </div>
  );
};
