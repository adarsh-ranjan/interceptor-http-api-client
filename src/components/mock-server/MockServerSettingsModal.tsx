import React, { useState } from 'react';
import { MockServer } from '../../types/server';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Settings, Shield, Radio, Check } from 'lucide-react';

interface MockServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: MockServer;
  onSave: (updatedServer: MockServer) => void;
}

export const MockServerSettingsModal: React.FC<MockServerSettingsModalProps> = ({
  open,
  onOpenChange,
  server,
  onSave,
}) => {
  const [port, setPort] = useState<number>(server.port);
  const [corsEnabled, setCorsEnabled] = useState<boolean>(server.corsEnabled ?? true);
  const [proxyFallbackEnabled, setProxyFallbackEnabled] = useState<boolean>(
    server.proxyFallbackEnabled ?? false
  );
  const [proxyFallbackUrl, setProxyFallbackUrl] = useState<string>(
    server.proxyFallbackUrl || 'https://api.github.com'
  );

  const handleSave = () => {
    onSave({
      ...server,
      port,
      corsEnabled,
      proxyFallbackEnabled,
      proxyFallbackUrl,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <span>Server Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Configure listening port, CORS preflight headers, and upstream proxy fallback for {server.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Port Setting */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Listening Port</span>
              <span className="text-[10px] text-muted-foreground font-mono">1024 - 65535</span>
            </label>
            <Input
              type="number"
              value={port}
              disabled={server.status === 'running'}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="3001"
              min={1024}
              max={65535}
            />
            {server.status === 'running' && (
              <p className="text-[11px] text-amber-400">
                Stop the server before changing port configuration.
              </p>
            )}
          </div>

          {/* CORS Preflight Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-[#141517]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automatic CORS Preflight</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Responds 204 to OPTIONS with Access-Control-* headers.
              </p>
            </div>
            <Switch
              checked={corsEnabled}
              onCheckedChange={setCorsEnabled}
              aria-label="Toggle CORS Preflight"
            />
          </div>

          {/* Proxy Fallback Toggle & URL */}
          <div className="p-3 rounded-lg border border-border bg-[#141517] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Radio className="w-3.5 h-3.5 text-primary" />
                  <span>Hybrid Proxy Fallback</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Forward unmapped routes to upstream backend server.
                </p>
              </div>
              <Switch
                checked={proxyFallbackEnabled}
                onCheckedChange={setProxyFallbackEnabled}
                aria-label="Toggle Proxy Fallback"
              />
            </div>

            {proxyFallbackEnabled && (
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <label className="text-xs font-medium text-foreground">Upstream Target URL</label>
                <Input
                  type="url"
                  value={proxyFallbackUrl}
                  onChange={(e) => setProxyFallbackUrl(e.target.value)}
                  placeholder="https://api.github.com or http://localhost:8080"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="amber" size="sm" onClick={handleSave}>
            <Check className="w-3.5 h-3.5 mr-1" />
            <span>Save Settings</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
