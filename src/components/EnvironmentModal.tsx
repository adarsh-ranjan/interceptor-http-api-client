import React, { useState } from 'react';
import { Environment, EnvironmentVariable } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { EnvironmentVariableRow } from './environments/EnvironmentVariableRow';
import {
  Globe,
  Plus,
  Trash2,
  Check,
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
    environments.length > 0 ? activeEnvId || environments[0].id : ''
  );

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
    const remaining = environments.filter((e) => e.id !== id);
    onUpdateEnvironments(remaining);
    if (activeEnvId === id) {
      onSetActiveEnvId(null);
    }
    if (selectedEnvId === id) {
      setSelectedEnvId(remaining.length > 0 ? remaining[0].id : '');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[560px] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="p-4 border-b border-border bg-[#141517]">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span>Manage Environments & Variables</span>
          </DialogTitle>
          <DialogDescription>
            Configure environment variables accessible throughout the request bar, headers, auth, and tests using {'{{variable}}'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Environment List */}
          <div className="w-56 bg-[#1a1b1e] border-r border-border flex flex-col select-none">
            <div className="p-2 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Environments
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleAddEnvironment}
                title="Add Environment"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-1">
              <div className="space-y-0.5">
                {environments.map((env) => {
                  const isSelected = env.id === selectedEnvId;
                  const isActive = env.id === activeEnvId;
                  return (
                    <div
                      key={env.id}
                      onClick={() => setSelectedEnvId(env.id)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#26282c] text-foreground font-medium border border-border/80'
                          : 'text-muted-foreground hover:bg-[#202226] hover:text-foreground border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                        {isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                            title="Active Environment"
                          />
                        )}
                        <span className="truncate">{env.name}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEnvironment(env.id);
                        }}
                        title="Delete Environment"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-5 w-5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Selected Environment Variables */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#141517]">
            {currentEnv ? (
              <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
                {/* Environment Details Header */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex-1">
                    <Input
                      value={currentEnv.name}
                      onChange={(e) =>
                        handleUpdateCurrentEnv((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Environment Name"
                      className="font-semibold text-sm h-8 bg-[#1a1b1e]"
                    />
                  </div>

                  <Button
                    variant={activeEnvId === currentEnv.id ? 'outline' : 'amber'}
                    size="sm"
                    onClick={() =>
                      onSetActiveEnvId(activeEnvId === currentEnv.id ? null : currentEnv.id)
                    }
                    className="h-8 text-xs font-semibold"
                  >
                    {activeEnvId === currentEnv.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Active Environment</span>
                      </>
                    ) : (
                      <span>Set as Active</span>
                    )}
                  </Button>
                </div>

                {/* Variables List */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Variables ({currentEnv.variables.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddVariable}
                      className="h-6 text-[11px] px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      <span>Add Variable</span>
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 rounded-md border border-border bg-[#1a1b1e] p-2">
                    <div className="space-y-1.5">
                      {currentEnv.variables.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No variables defined in this environment. Click "Add Variable" above.
                        </div>
                      ) : (
                        currentEnv.variables.map((variable) => (
                          <EnvironmentVariableRow
                            key={variable.id}
                            variable={variable}
                            onUpdate={(field, val) =>
                              handleUpdateVariable(variable.id, field, val)
                            }
                            onDelete={() => handleDeleteVariable(variable.id)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Dynamic Variables Tip */}
                <div className="p-2.5 rounded-md bg-[#1a1b1e] border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Dynamic tokens like <code className="text-primary font-mono">{`{{$guid}}`}</code>, <code className="text-primary font-mono">{`{{$timestamp}}`}</code>, and <code className="text-primary font-mono">{`{{$randomInt}}`}</code> are also available automatically.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                Select or create an environment to view variables.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
