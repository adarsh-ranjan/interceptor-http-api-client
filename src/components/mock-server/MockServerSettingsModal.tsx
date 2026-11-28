import React, { useState } from 'react';
import { MockServer } from '../../types/server';
import { X, Shield } from 'lucide-react';

interface MockServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: MockServer;
  onSave: (updated: MockServer) => void;
}

export const MockServerSettingsModal: React.FC<MockServerSettingsModalProps> = ({
  isOpen,
  onClose,
  server,
  onSave,
}) => {
  const [name, setName] = useState(server.name);
  const [port, setPort] = useState(server.port);
  const [proxyFallbackUrl, setProxyFallbackUrl] = useState(server.proxyFallbackUrl || '');
  const [defaultDelayMs, setDefaultDelayMs] = useState(server.defaultDelayMs || 0);
  const [corsEnabled, setCorsEnabled] = useState(server.corsEnabled ?? true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...server,
      name,
      port,
      proxyFallbackUrl: proxyFallbackUrl.trim() || undefined,
      defaultDelayMs,
      corsEnabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[450px] bg-[#1e1e20] border border-[#333333] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs text-[#cccccc]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <span className="font-semibold text-white">Server Settings</span>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          <div>
            <label className="block text-[#888888] mb-1 font-medium">Server Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#26292b] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:border-[#d99b26] outline-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="block text-[#888888] mb-1 font-medium">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 3001)}
                min={1024}
                max={65535}
                required
                className="w-full bg-[#26292b] border border-[#333333] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-[#d99b26] outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[#888888] mb-1 font-medium">Default Latency (ms)</label>
              <input
                type="number"
                value={defaultDelayMs}
                onChange={(e) => setDefaultDelayMs(parseInt(e.target.value, 10) || 0)}
                min={0}
                className="w-full bg-[#26292b] border border-[#333333] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-[#d99b26] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#888888] mb-1 font-medium">
              Proxy Fallback Upstream URL (Optional)
            </label>
            <input
              type="text"
              value={proxyFallbackUrl}
              onChange={(e) => setProxyFallbackUrl(e.target.value)}
              placeholder="https://api.production.com"
              className="w-full bg-[#26292b] border border-[#333333] rounded px-3 py-1.5 text-xs text-white font-mono placeholder:text-[#666666] focus:border-[#d99b26] outline-none"
            />
            <p className="text-[11px] text-[#777777] mt-1">
              Unmatched routes will be seamlessly proxied to this upstream server.
            </p>
          </div>

          <div className="pt-2 border-t border-[#333333]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={corsEnabled}
                onChange={(e) => setCorsEnabled(e.target.checked)}
                className="accent-[#d99b26]"
              />
              <span className="text-white font-medium">Enable CORS</span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-[#26292b] text-[#888888] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#d99b26] hover:bg-[#c2871a] text-white font-medium transition-colors cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
