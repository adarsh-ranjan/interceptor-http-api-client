import React, { useState } from 'react';
import { Environment, EnvironmentVariable } from '../types';
import {
  Globe,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface EnvironmentModalProps {
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
                className="flex items-center gap-1 text-[11px] text-[#d99b26] hover:text-[#e5a730] font-medium px-2 py-0.5 rounded hover:bg-[#d99b26]/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {environments.length === 0 ? (
                <p className="text-[11px] text-[#777777] italic p-3 text-center">
                  No environments yet.
                </p>
              ) : (
                environments.map((env) => {
                  const isSelected = env.id === currentEnv?.id;
                  const isActive = env.id === activeEnvId;

                  return (
                    <div
                      key={env.id}
                      onClick={() => setSelectedEnvId(env.id)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer group transition-colors ${
                        isSelected
                          ? 'bg-[#26292b] text-white font-medium border border-[#333333]'
                          : 'text-[#cccccc] hover:bg-[#26292b]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
                        <span className="truncate">{env.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/30">
                            Active
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="text-[#777777] hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete environment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reference Box */}
            <div className="p-2.5 border-t border-[#333333] bg-[#222224] text-[11px] text-[#888888]">
              <div className="flex items-center gap-1 text-[#cccccc] font-semibold mb-1">
                <Sparkles className="w-3 h-3 text-[#d99b26]" />
                <span>Dynamic Built-ins</span>
              </div>
              <ul className="space-y-0.5 font-mono text-[10px] text-[#777777]">
                <li><code className="text-[#d99b26]">{"{{$guid}}"}</code> : UUID v4</li>
                <li><code className="text-[#d99b26]">{"{{$timestamp}}"}</code> : Epoch ms</li>
                <li><code className="text-[#d99b26]">{"{{$isoTimestamp}}"}</code> : ISO Date</li>
                <li><code className="text-[#d99b26]">{"{{$randomInt}}"}</code> : 1 - 1000</li>
              </ul>
            </div>
          </div>

          {/* Variables Table Editor (Right) */}
          <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] overflow-hidden">
            {currentEnv ? (
              <>
                <div className="flex items-center justify-between p-3 border-b border-[#333333] bg-[#222224]">
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <label className="text-[#888888] font-medium shrink-0">Name:</label>
                    <input
                      type="text"
                      value={currentEnv.name}
                      onChange={(e) =>
                        handleUpdateCurrentEnv((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1 text-[#cccccc] focus:outline-none focus:border-[#444444] font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {activeEnvId === currentEnv.id ? (
                      <button
                        onClick={() => onSetActiveEnvId(null)}
                        className="px-2.5 py-1 rounded border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        ✓ Currently Active
                      </button>
                    ) : (
                      <button
                        onClick={() => onSetActiveEnvId(currentEnv.id)}
                        className="px-2.5 py-1 rounded border border-[#333333] text-[#cccccc] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      onClick={handleAddVariable}
                      className="flex items-center gap-1 px-3 py-1 bg-[#d99b26] hover:bg-[#c2871a] text-white rounded font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>
                </div>

                {/* Variables List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {currentEnv.variables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-[#777777]">
                      <p className="text-xs">No variables in this environment.</p>
                      <p className="text-[11px] text-[#666666] mt-1">
                        Use variables like <code className="text-[#d99b26]">{"{{baseUrl}}"}</code> in URLs, headers, and request bodies.
                      </p>
                      <button
                        onClick={handleAddVariable}
                        className="mt-3 px-3 py-1 bg-[#d99b26]/10 text-[#d99b26] hover:bg-[#d99b26]/20 rounded border border-[#d99b26]/30 font-medium cursor-pointer"
                      >
                        + Add First Variable
                      </button>
                    </div>
                  ) : (
                    currentEnv.variables.map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md border transition-colors ${
                          v.enabled ? 'bg-[#222224] border-[#333333]' : 'bg-[#1a1a1a] border-transparent opacity-60'
                        } hover:border-[#333333] group`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateVariable(v.id, 'enabled', !v.enabled)}
                          className="text-[#888888] hover:text-[#cccccc] p-1 cursor-pointer"
                          title={v.enabled ? 'Disable variable' : 'Enable variable'}
                        >
                          {v.enabled ? (
                            <CheckSquare className="w-4 h-4 text-[#d99b26]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#666666]" />
                          )}
                        </button>

                        <div className="w-1/3 relative">
                          <input
                            type="text"
                            placeholder="VARIABLE"
                            value={v.key}
                            onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1 text-[#cccccc] font-mono text-xs focus:outline-none focus:border-[#444444]"
                          />
                        </div>

                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={v.value}
                            onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1 text-[#cccccc] font-mono text-xs focus:outline-none focus:border-[#444444]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteVariable(v.id)}
                          className="text-[#777777] hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[#777777]">
                Select or create an environment on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
