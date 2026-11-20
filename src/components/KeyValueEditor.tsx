import React from 'react';
import { KeyValuePair, Environment } from '../types';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { VariableInput } from './VariableInput';

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  descriptionPlaceholder?: string;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description (optional)',
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
}) => {
  const handleUpdate = (id: string, field: keyof KeyValuePair, value: any) => {
    const updated = items.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    const newItem: KeyValuePair = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true,
      description: '',
    };
    onChange([...items, newItem]);
  };

  const handleToggleAll = () => {
    const allEnabled = items.every((i) => i.enabled);
    onChange(items.map((i) => ({ ...i, enabled: !allEnabled })));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d]/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Key-Value Pairs ({items.filter((i) => i.enabled && i.key).length} active)
        </span>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleToggleAll}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-0.5 rounded hover:bg-[#21262d] cursor-pointer"
            >
              Toggle All
            </button>
          )}
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors px-2 py-0.5 rounded hover:bg-sky-500/10 font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <p className="text-xs">No parameters configured.</p>
            <button
              onClick={handleAdd}
              className="mt-2 text-xs text-sky-400 hover:underline cursor-pointer"
            >
              + Click to add your first parameter
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 group p-1 rounded-md transition-colors ${
                item.enabled ? 'bg-[#161b22]/70' : 'bg-[#161b22]/30 opacity-60'
              } hover:bg-[#21262d]/80 border border-transparent hover:border-[#30363d]`}
            >
              <button
                type="button"
                onClick={() => handleUpdate(item.id, 'enabled', !item.enabled)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title={item.enabled ? 'Disable parameter' : 'Enable parameter'}
              >
                {item.enabled ? (
                  <CheckSquare className="w-4 h-4 text-sky-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>

              <div className="w-1/3">
                <VariableInput
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(val) => handleUpdate(item.id, 'key', val)}
                  activeEnvironment={activeEnvironment}
                  environments={environments}
                  onOpenEnvironmentModal={onOpenEnvironmentModal}
                />
              </div>

              <div className="flex-1">
                <VariableInput
                  placeholder={valuePlaceholder}
                  value={item.value}
                  onChange={(val) => handleUpdate(item.id, 'value', val)}
                  activeEnvironment={activeEnvironment}
                  environments={environments}
                  onOpenEnvironmentModal={onOpenEnvironmentModal}
                />
              </div>

              <input
                type="text"
                placeholder={descriptionPlaceholder}
                value={item.description || ''}
                onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
                className="w-1/4 hidden md:block bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-slate-400 focus:outline-none focus:border-sky-500"
              />

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Delete parameter"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
