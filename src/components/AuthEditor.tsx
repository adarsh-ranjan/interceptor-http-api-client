import React, { useState } from 'react';
import { AuthConfig, AuthType } from '../types';
import { Shield, Key, Lock, Eye, EyeOff, Info, CheckCircle2 } from 'lucide-react';

interface AuthEditorProps {
  auth?: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({
  auth = { type: 'none' },
  onChange,
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
    <div className="flex flex-col h-full text-xs space-y-4 max-w-xl">
      {/* Auth Type Selector */}
      <div className="flex items-center gap-2">
        <label className="text-slate-400 font-medium w-28 shrink-0 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Auth Type:</span>
        </label>
        <select
          value={auth.type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-sky-500"
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </div>

      {/* No Auth State */}
      {auth.type === 'none' && (
        <div className="p-4 rounded-md border border-[#30363d]/50 bg-[#0d1117]/50 text-slate-500 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-slate-300 font-medium">This request does not use authentication.</p>
            <p className="text-[11px] mt-0.5">
              Select an authentication type above to automatically configure Bearer tokens, Basic credentials, or API keys.
            </p>
          </div>
        </div>
      )}

      {/* Bearer Token Form */}
      {auth.type === 'bearer' && (
        <div className="space-y-3 bg-[#0d1117] p-3.5 rounded-md border border-[#30363d]">
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <Key className="w-3 h-3 text-sky-400" />
              <span>Token</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="e.g. {{apiKey}} or eyJhbGciOi..."
                value={auth.bearerToken || ''}
                onChange={(e) => handleFieldChange('bearerToken', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 pr-8 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 text-slate-400 hover:text-white"
                title={showSecret ? 'Hide token' : 'Show token'}
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Automatically injects <code className="text-sky-400">Authorization: Bearer &lt;token&gt;</code> header on execution.</span>
          </div>
        </div>
      )}

      {/* Basic Auth Form */}
      {auth.type === 'basic' && (
        <div className="space-y-3 bg-[#0d1117] p-3.5 rounded-md border border-[#30363d]">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Username</label>
            <input
              type="text"
              placeholder="e.g. {{username}} or admin"
              value={auth.basicUsername || ''}
              onChange={(e) => handleFieldChange('basicUsername', e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Password</label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="e.g. {{password}} or secret"
                value={auth.basicPassword || ''}
                onChange={(e) => handleFieldChange('basicPassword', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 pr-8 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 text-slate-400 hover:text-white"
                title={showSecret ? 'Hide password' : 'Show password'}
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Automatically base64 encodes credentials into <code className="text-sky-400">Authorization: Basic ...</code> header.</span>
          </div>
        </div>
      )}

      {/* API Key Form */}
      {auth.type === 'apikey' && (
        <div className="space-y-3 bg-[#0d1117] p-3.5 rounded-md border border-[#30363d]">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Key Name</label>
            <input
              type="text"
              placeholder="e.g. X-API-Key or api_key"
              value={auth.apiKeyName || ''}
              onChange={(e) => handleFieldChange('apiKeyName', e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Value</label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="e.g. {{apiKey}} or 9e248b1..."
                value={auth.apiKeyValue || ''}
                onChange={(e) => handleFieldChange('apiKeyValue', e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 pr-8 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 text-slate-400 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Add To</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="apiKeyLocation"
                  value="header"
                  checked={auth.apiKeyLocation === 'header'}
                  onChange={() => handleFieldChange('apiKeyLocation', 'header')}
                  className="text-sky-500 focus:ring-0"
                />
                <span className="text-slate-300">Header</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="apiKeyLocation"
                  value="query"
                  checked={auth.apiKeyLocation === 'query'}
                  onChange={() => handleFieldChange('apiKeyLocation', 'query')}
                  className="text-sky-500 focus:ring-0"
                />
                <span className="text-slate-300">Query Params</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
