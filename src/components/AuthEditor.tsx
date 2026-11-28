import React, { useState } from 'react';
import { AuthConfig, AuthType, Environment } from '../types';
import { ChevronDown, Check, Eye, EyeOff } from 'lucide-react';
import { VariableInput } from './VariableInput';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface AuthEditorProps {
  auth?: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
}

export function humanizeAuthMode(type: AuthType): string {
  switch (type) {
    case 'none':
      return 'No Auth';
    case 'bearer':
      return 'Bearer Token';
    case 'basic':
      return 'Basic Auth';
    case 'apikey':
      return 'API Key';
    default:
      return 'No Auth';
  }
}

const AUTH_MODES: { id: AuthType; label: string }[] = [
  { id: 'none', label: 'No Auth' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'apikey', label: 'API Key' },
];

export const AuthEditor: React.FC<AuthEditorProps> = ({
  auth = { type: 'none' },
  onChange,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
}) => {
  const [showSecret, setShowSecret] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    onChange({
      ...auth,
      type,
      apiKeyLocation: auth.apiKeyLocation || 'header',
    });
  };

  const handleFieldChange = (field: keyof AuthConfig, value: any) => {
    onChange({
      ...auth,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col h-full text-xs p-4 overflow-y-auto select-none">
      {/* Auth Mode Dropdown Selector */}
      <div className="flex items-center gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-normal gap-1.5 bg-background border-border text-foreground hover:bg-muted"
            >
              <span>{humanizeAuthMode(auth.type)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {AUTH_MODES.map((mode) => {
              const isSelected = auth.type === mode.id;
              return (
                <DropdownMenuItem
                  key={mode.id}
                  onClick={() => handleTypeChange(mode.id)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>{mode.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Auth Content Panes */}
      <div className="max-w-md space-y-4">
        {/* NONE */}
        {auth.type === 'none' && (
          <div className="text-xs text-muted-foreground">
            This request does not use any authentication.
          </div>
        )}

        {/* BEARER TOKEN */}
        {auth.type === 'bearer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Token</label>
              <div className="relative flex items-center">
                <VariableInput
                  type={showSecret ? 'text' : 'password'}
                  placeholder="e.g. {{token}} or Bearer eyJhbGci..."
                  value={auth.bearerToken || ''}
                  onChange={(val) => handleFieldChange('bearerToken', val)}
                  activeEnvironment={activeEnvironment}
                  environments={environments}
                  onOpenEnvironmentModal={onOpenEnvironmentModal}
                  className="pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-1 z-20 text-muted-foreground hover:text-foreground h-7 w-7"
                  title={showSecret ? 'Hide token' : 'Show token'}
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* BASIC AUTH */}
        {auth.type === 'basic' && (
          <div className="space-y-3">
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Username</label>
              <VariableInput
                placeholder="Username"
                value={auth.basicUsername || ''}
                onChange={(val) => handleFieldChange('basicUsername', val)}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvironmentModal}
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Password</label>
              <div className="relative flex items-center">
                <VariableInput
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Password"
                  value={auth.basicPassword || ''}
                  onChange={(val) => handleFieldChange('basicPassword', val)}
                  activeEnvironment={activeEnvironment}
                  environments={environments}
                  onOpenEnvironmentModal={onOpenEnvironmentModal}
                  className="pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-1 z-20 text-muted-foreground hover:text-foreground h-7 w-7"
                  title={showSecret ? 'Hide password' : 'Show password'}
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* API KEY */}
        {auth.type === 'apikey' && (
          <div className="space-y-3">
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Key</label>
              <VariableInput
                placeholder="e.g. X-API-Key"
                value={auth.apiKeyName || ''}
                onChange={(val) => handleFieldChange('apiKeyName', val)}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvironmentModal}
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Value</label>
              <VariableInput
                placeholder="Value"
                value={auth.apiKeyValue || ''}
                onChange={(val) => handleFieldChange('apiKeyValue', val)}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvironmentModal}
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-normal mb-1">Add To</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="apiKeyLocation"
                    checked={auth.apiKeyLocation === 'header'}
                    onChange={() => handleFieldChange('apiKeyLocation', 'header')}
                    className="accent-amber-500"
                  />
                  <span>Header</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="apiKeyLocation"
                    checked={auth.apiKeyLocation === 'query'}
                    onChange={() => handleFieldChange('apiKeyLocation', 'query')}
                    className="accent-amber-500"
                  />
                  <span>Query Params</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
