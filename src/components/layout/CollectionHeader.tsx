import React from 'react';
import { Environment } from '../../types';
import { Box, ChevronDown, GitFork, MoreHorizontal, Shield } from 'lucide-react';
import { EnvironmentSelector } from '../EnvironmentSelector';
import { ToastData } from '../Toast';

interface CollectionHeaderProps {
  mainView: 'requests' | 'mock-servers';
  onChangeMainView: (view: 'requests' | 'mock-servers') => void;
  runningMockServerCount: number;
  activeCollectionName?: string;
  environments: Environment[];
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  onOpenEnvModal: () => void;
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

export const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  mainView,
  onChangeMainView,
  runningMockServerCount,
  activeCollectionName,
  environments,
  activeEnvId,
  onSelectEnv,
  onOpenEnvModal,
  showToast,
}) => {
  return (
    <div className="flex items-center justify-between px-4 h-9 bg-[#1a1a1a] border-b border-[#333333] shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-[#222224] p-0.5 rounded border border-[#333333]">
          <button
            type="button"
            onClick={() => onChangeMainView('requests')}
            className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              mainView === 'requests'
                ? 'bg-[#d99b26] text-black font-semibold shadow-xs'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Client Requests
          </button>
          <button
            type="button"
            onClick={() => onChangeMainView('mock-servers')}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              mainView === 'mock-servers'
                ? 'bg-[#d99b26] text-black font-semibold shadow-xs'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <span>Mock Servers</span>
            {runningMockServerCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {mainView === 'requests' && (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#26292b] rounded cursor-pointer transition-colors font-medium">
            <Box className="w-3.5 h-3.5 text-[#999999]" />
            <span>{activeCollectionName || 'Test'}</span>
            <ChevronDown className="w-3 h-3 text-[#777777]" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            showToast({
              type: 'info',
              title: 'Git Integration',
              message: 'Git repository tracking active.',
            })
          }
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#888888] hover:text-[#cccccc] hover:bg-[#26292b] border border-[#333333] rounded transition-colors cursor-pointer"
          title="Initialize Git repository"
        >
          <GitFork className="w-3.5 h-3.5 text-[#d99b26]" />
          <span>Initialize Git</span>
        </button>

        <button
          className="p-1.5 text-[#888888] hover:text-emerald-400 hover:bg-[#26292b] rounded transition-colors cursor-pointer"
          title="Safe Sandbox Active"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        <button
          className="p-1 text-[#888888] hover:text-[#cccccc] hover:bg-[#26292b] border border-[#333333] rounded transition-colors cursor-pointer"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        <EnvironmentSelector
          environments={environments}
          activeEnvId={activeEnvId}
          onSelectEnv={onSelectEnv}
          onOpenManageModal={onOpenEnvModal}
        />
      </div>
    </div>
  );
};
