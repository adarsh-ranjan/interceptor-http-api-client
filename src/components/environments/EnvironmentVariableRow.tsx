import React from 'react';
import { EnvironmentVariable } from '../../types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

interface EnvironmentVariableRowProps {
  variable: EnvironmentVariable;
  onUpdate: (field: keyof EnvironmentVariable, value: any) => void;
  onDelete: () => void;
}

export const EnvironmentVariableRow: React.FC<EnvironmentVariableRowProps> = ({
  variable,
  onUpdate,
  onDelete,
}) => {
  return (
    <div className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={() => onUpdate('enabled', !variable.enabled)}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title={variable.enabled ? 'Disable Variable' : 'Enable Variable'}
      >
        {variable.enabled ? (
          <CheckSquare className="w-4 h-4 text-primary" />
        ) : (
          <Square className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <Input
        value={variable.key}
        onChange={(e) => onUpdate('key', e.target.value)}
        placeholder="KEY (e.g. baseUrl)"
        className={`flex-1 font-mono text-xs h-7 bg-[#141517] ${
          !variable.enabled ? 'opacity-50' : ''
        }`}
      />

      <Input
        value={variable.value}
        onChange={(e) => onUpdate('value', e.target.value)}
        placeholder="VALUE"
        className={`flex-1 font-mono text-xs h-7 bg-[#141517] ${
          !variable.enabled ? 'opacity-50' : ''
        }`}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        title="Delete Variable"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-7 w-7"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
