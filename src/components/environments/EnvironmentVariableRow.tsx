import React from 'react';
import { EnvironmentVariable } from '../../types';
import { Trash2 } from 'lucide-react';

interface EnvironmentVariableRowProps {
  variable: EnvironmentVariable;
  onUpdate: (id: string, field: keyof EnvironmentVariable, value: any) => void;
  onDelete: (id: string) => void;
}

export const EnvironmentVariableRow: React.FC<EnvironmentVariableRowProps> = ({
  variable,
  onUpdate,
  onDelete,
}) => {
  return (
    <tr className="hover:bg-[#222224] transition-colors group">
      <td className="w-8 text-center border-b border-r border-[#333333] p-0">
        <input
          type="checkbox"
          checked={variable.enabled}
          onChange={(e) => onUpdate(variable.id, 'enabled', e.target.checked)}
          className="accent-[#d99b26] cursor-pointer"
        />
      </td>
      <td className="w-1/3 border-b border-r border-[#333333] p-0">
        <input
          type="text"
          value={variable.key}
          onChange={(e) => onUpdate(variable.id, 'key', e.target.value)}
          placeholder="VARIABLE_NAME"
          className="w-full bg-transparent px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-[#555555] outline-none"
        />
      </td>
      <td className="border-b border-r border-[#333333] p-0">
        <input
          type="text"
          value={variable.value}
          onChange={(e) => onUpdate(variable.id, 'value', e.target.value)}
          placeholder="value"
          className="w-full bg-transparent px-2.5 py-1.5 font-mono text-xs text-[#cccccc] placeholder:text-[#555555] outline-none"
        />
      </td>
      <td className="w-8 border-b border-[#333333] p-0 text-center">
        <button
          onClick={() => onDelete(variable.id)}
          className="p-1 text-[#666666] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Delete variable"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};
