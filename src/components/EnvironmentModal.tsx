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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl h-[560px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Manage Environments & Variables</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left sidebar (Envs) + Right editor (Variables) */}
        <div className="flex-1 flex overflow-hidden divide-x divide-[#30363d]">
          {/* Environments list (Left) */}
          <div className="w-56 bg-[#161b22] flex flex-col h-full">
            <div className="flex items-center justify-between p-2.5 border-b border-[#30363d]/50">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Environments
              </span>
              <button
                onClick={handleAddEnvironment}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {environments.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-3 text-center">
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
                          ? 'bg-[#21262d] text-white font-medium border border-[#30363d]'
                          : 'text-slate-300 hover:bg-[#21262d]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
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
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="p-2.5 border-t border-[#30363d]/50 bg-[#0d1117]/50 text-[11px] text-slate-400">
              <div className="flex items-center gap-1 text-slate-300 font-semibold mb-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Dynamic Built-ins</span>
              </div>
              <ul className="space-y-0.5 font-mono text-[10px] text-slate-500">
                <li><code className="text-sky-400">{"{{$guid}}"}</code> : UUID v4</li>
                <li><code className="text-sky-400">{"{{$timestamp}}"}</code> : Epoch ms</li>
                <li><code className="text-sky-400">{"{{$isoTimestamp}}"}</code> : ISO Date</li>
                <li><code className="text-sky-400">{"{{$randomInt}}"}</code> : 1 - 1000</li>
              </ul>
            </div>
          </div>

          {/* Variables Table Editor (Right) */}
          <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
            {currentEnv ? (
              <>
                <div className="flex items-center justify-between p-3 border-b border-[#30363d] bg-[#161b22]">
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <label className="text-slate-400 font-medium shrink-0">Name:</label>
                    <input
                      type="text"
                      value={currentEnv.name}
                      onChange={(e) =>
                        handleUpdateCurrentEnv((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {activeEnvId === currentEnv.id ? (
                      <button
                        onClick={() => onSetActiveEnvId(null)}
                        className="px-2.5 py-1 rounded border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        ✓ Currently Active
                      </button>
                    ) : (
                      <button
                        onClick={() => onSetActiveEnvId(currentEnv.id)}
                        className="px-2.5 py-1 rounded border border-[#30363d] text-slate-300 hover:text-white hover:bg-[#21262d] transition-colors"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      onClick={handleAddVariable}
                      className="flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>
                </div>

                {/* Variables List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {currentEnv.variables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                      <p className="text-xs">No variables in this environment.</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Use variables like <code className="text-sky-400">{"{{baseUrl}}"}</code> in URLs, headers, and request bodies.
                      </p>
                      <button
                        onClick={handleAddVariable}
                        className="mt-3 px-3 py-1 bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 rounded border border-sky-500/30 font-medium"
                      >
                        + Add First Variable
                      </button>
                    </div>
                  ) : (
                    currentEnv.variables.map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md border transition-colors ${
                          v.enabled ? 'bg-[#161b22] border-[#30363d]/60' : 'bg-[#161b22]/40 border-transparent opacity-60'
                        } hover:border-[#30363d] group`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateVariable(v.id, 'enabled', !v.enabled)}
                          className="text-slate-400 hover:text-slate-200 p-1"
                          title={v.enabled ? 'Disable variable' : 'Enable variable'}
                        >
                          {v.enabled ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="w-1/3 relative">
                          <input
                            type="text"
                            placeholder="VARIABLE"
                            value={v.key}
                            onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={v.value}
                            onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteVariable(v.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="flex items-center justify-center h-full text-slate-500">
                Select or create an environment on the left.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
