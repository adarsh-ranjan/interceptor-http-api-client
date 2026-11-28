import React, { useState } from 'react';
import { Environment, EnvironmentVariable } from '../../types';
import { EnvironmentVariableRow } from './EnvironmentVariableRow';
import {
  Globe,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  onUpdateEnvironments: (envs: Environment[]) => void;
  activeEnvId: string | null;
  onSetActiveEnvId: (id: string | null) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  onUpdateEnvironments,
  activeEnvId,
  onSetActiveEnvId,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments.length > 0 ? (activeEnvId || environments[0].id) : ''
  );

  if (!isOpen) return null;

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0];

  const handleAddEnvironment = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: `Environment ${environments.length + 1}`,
      variables: [
        {
          id: `var-${Date.now()}`,
          key: 'baseUrl',
          value: 'https://api.example.com',
          enabled: true,
        },
      ],
    };
    onUpdateEnvironments([...environments, newEnv]);
    setSelectedEnvId(newEnv.id);
  };

  const handleDeleteEnvironment = (id: string) => {
    if (confirm('Are you sure you want to delete this environment?')) {
      const remaining = environments.filter((e) => e.id !== id);
      onUpdateEnvironments(remaining);
      if (activeEnvId === id) {
        onSetActiveEnvId(null);
      }
      if (selectedEnvId === id) {
        setSelectedEnvId(remaining.length > 0 ? remaining[0].id : '');
      }
    }
  };

  const handleUpdateCurrentEnv = (updater: (prev: Environment) => Environment) => {
    if (!currentEnv) return;
    const updated = environments.map((e) => (e.id === currentEnv.id ? updater(e) : e));
    onUpdateEnvironments(updated);
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const newVar: EnvironmentVariable = {
      id: `var-${Date.now()}`,
      key: '',
      value: '',
      enabled: true,
    };
    handleUpdateCurrentEnv((prev) => ({
      ...prev,
      variables: [...prev.variables, newVar],
    }));
  };

  const handleUpdateVariable = (id: string, field: keyof EnvironmentVariable, value: any) => {
    handleUpdateCurrentEnv((prev) => ({
      ...prev,
      variables: prev.variables.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    }));
  };

  const handleDeleteVariable = (id: string) => {
    handleUpdateCurrentEnv((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.id !== id),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-3xl h-[560px] bg-[#222224] border border-[#333333] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-[#cccccc] font-semibold text-sm">
            <Globe className="w-4 h-4 text-[#d99b26]" />
            <span>Manage Environments & Variables</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left sidebar (Envs) + Right editor (Variables) */}
        <div className="flex-1 flex overflow-hidden divide-x divide-[#333333]">
          {/* Environments list (Left) */}
          <div className="w-56 bg-[#1a1a1a] flex flex-col h-full">
            <div className="flex items-center justify-between p-2.5 border-b border-[#333333]">
              <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
                Environments
              </span>
              <button
                onClick={handleAddEnvironment}
                className="flex items-center gap-1 text-[11px] text-[#d99b26] hover:text-white transition-colors cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {environments.map((env) => {
                const isSelected = env.id === selectedEnvId;
                const isActive = env.id === activeEnvId;

                return (
                  <div
                    key={env.id}
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#222224] text-white font-medium border border-[#333333]'
                        : 'text-[#aaaaaa] hover:bg-[#1a1a1a] hover:text-[#cccccc]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-xs">{env.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active Environment" />
                      )}
                      {environments.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="text-[#666666] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                          title="Delete environment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Set Active / Deactivate Footer Button */}
            {currentEnv && (
              <div className="p-2 border-t border-[#333333] bg-[#1a1a1a]">
                <button
                  onClick={() => onSetActiveEnvId(activeEnvId === currentEnv.id ? null : currentEnv.id)}
                  className={`w-full py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeEnvId === currentEnv.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#222224] hover:bg-[#2d2d30] text-[#cccccc] border border-[#333333]'
                  }`}
                >
                  {activeEnvId === currentEnv.id ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Active in Workspace</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-[#888888]" />
                      <span>Set as Active</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Variables editor (Right) */}
          {currentEnv ? (
            <div className="flex-1 bg-[#1a1a1a] flex flex-col h-full overflow-hidden">
              {/* Environment Name bar */}
              <div className="p-3 border-b border-[#333333] bg-[#222224] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[#888888] font-medium text-xs">Name:</label>
                  <input
                    type="text"
                    value={currentEnv.name}
                    onChange={(e) => handleUpdateCurrentEnv((prev) => ({ ...prev, name: e.target.value }))}
                    className="bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#d99b26] flex-1 max-w-xs font-medium"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#888888]">
                  <Sparkles className="w-3.5 h-3.5 text-[#d99b26]" />
                  <span>Use in URLs, Headers, Body as <code className="text-[#d99b26] font-mono">{"{{varName}}"}</code></span>
                </div>
              </div>

              {/* Variables Table */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="border border-[#333333] rounded overflow-hidden bg-[#1a1a1a]">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#222224] text-[#888888] select-none h-7">
                        <td className="w-8 text-center border-b border-r border-[#333333]"></td>
                        <td className="w-1/3 px-2.5 py-1 border-b border-r border-[#333333] font-normal">
                          Variable
                        </td>
                        <td className="px-2.5 py-1 border-b border-r border-[#333333] font-normal">
                          Value
                        </td>
                        <td className="w-8 border-b border-[#333333]"></td>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                      {currentEnv.variables.map((v) => (
                        <EnvironmentVariableRow
                          key={v.id}
                          variable={v}
                          onUpdate={handleUpdateVariable}
                          onDelete={handleDeleteVariable}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2.5">
                  <button
                    onClick={handleAddVariable}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#222224] hover:bg-[#2a2a2d] text-[#cccccc] hover:text-white border border-[#333333] transition-colors cursor-pointer text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#d99b26]" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#666666]">
              Select or create an environment
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
