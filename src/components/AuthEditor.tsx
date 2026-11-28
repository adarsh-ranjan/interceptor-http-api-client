import React, { useRef, useState } from 'react';
import { AuthConfig, AuthType, Environment } from '../types';
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { PortalMenu } from './PortalMenu';
import { VariableInput } from './VariableInput';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
      setIsMenuOpen(true);
    }
  };

  const handleTypeChange = (type: AuthType) => {
    onChange({
      ...auth,
      type,
      apiKeyLocation: auth.apiKeyLocation || 'header',
    });
    setIsMenuOpen(false);
  };

  const handleFieldChange = (field: keyof AuthConfig, value: any) => {
    onChange({ ...auth, [field]: value });
  };

  const renderSecretToggle = (title: string) => (
    <button
      type="button"
      onClick={() => setShowSecret(!showSecret)}
      className="absolute right-2.5 z-20 text-[#888888] hover:text-white cursor-pointer"
      title={title}
    >
      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-xs p-4 overflow-y-auto select-none">
      <div className="flex items-center gap-2 mb-4">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleDropdown}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#222224] hover:bg-[#26292b] border border-[#333333] text-[#cccccc] font-medium transition-colors cursor-pointer"
        >
          <span>{humanizeAuthMode(auth.type)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#777777]" />
        </button>
      </div>

      <PortalMenu
        isOpen={isMenuOpen}
        position={menuPos}
        onClose={() => setIsMenuOpen(false)}
        triggerRef={triggerRef}
        className="w-44 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        {AUTH_MODES.map((mode) => {
          const isSelected = auth.type === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleTypeChange(mode.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'text-white bg-[#26292b] font-medium'
                  : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
              }`}
            >
              <span>{mode.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26]" />}
            </button>
          );
        })}
      </PortalMenu>

      <div className="max-w-md space-y-4">
        {auth.type === 'none' && (
          <div className="text-xs text-[#888888]">
            This request does not use any authentication.
          </div>
        )}

        {auth.type === 'bearer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[#888888] font-normal mb-1">Token</label>
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
                {renderSecretToggle(showSecret ? 'Hide token' : 'Show token')}
              </div>
            </div>
          </div>
        )}

        {auth.type === 'basic' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[#888888] font-normal mb-1">Username</label>
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
              <label className="block text-[#888888] font-normal mb-1">Password</label>
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
                {renderSecretToggle(showSecret ? 'Hide password' : 'Show password')}
              </div>
            </div>
          </div>
        )}

        {auth.type === 'apikey' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[#888888] font-normal mb-1">Key</label>
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
              <label className="block text-[#888888] font-normal mb-1">Value</label>
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
              <label className="block text-[#888888] font-normal mb-1">Add To</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#cccccc]">
                  <input
                    type="radio"
                    name="apiKeyLocation"
                    checked={auth.apiKeyLocation === 'header'}
                    onChange={() => handleFieldChange('apiKeyLocation', 'header')}
                    className="accent-[#d99b26]"
                  />
                  <span>Header</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#cccccc]">
                  <input
                    type="radio"
                    name="apiKeyLocation"
                    checked={auth.apiKeyLocation === 'query'}
                    onChange={() => handleFieldChange('apiKeyLocation', 'query')}
                    className="accent-[#d99b26]"
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
