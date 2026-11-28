import React from 'react';
import { MockServer } from '../../types/server';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MockServerSelectorDropdown } from '../MockServerSelectorDropdown';
import { Play, Square, Settings, Plus, ArrowLeft, Radio } from 'lucide-react';

interface MockServerHeaderProps {
  servers: MockServer[];
  activeServer: MockServer;
  onSelectServer: (serverId: string) => void;
  onToggleServer: (server: MockServer) => void;
  onOpenSettings: () => void;
  onNewServer: () => void;
  onClose?: () => void;
}

export const MockServerHeader: React.FC<MockServerHeaderProps> = ({
  servers,
  activeServer,
  onSelectServer,
  onToggleServer,
  onOpenSettings,
  onNewServer,
  onClose,
}) => {
  const isRunning = activeServer.status === 'running';

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1b1e] border-b border-border select-none shrink-0">
      {/* Left: Back & Server Selector */}
      <div className="flex items-center gap-3">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Return to Client Requests"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <MockServerSelectorDropdown
            servers={servers}
            activeServerId={activeServer.id}
            onSelectServer={onSelectServer}
          />

          <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
            Port {activeServer.port}
          </Badge>

          {activeServer.proxyFallbackEnabled && (
            <Badge variant="amber" className="hidden sm:inline-flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-primary" />
              <span>Proxy</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={isRunning ? 'destructive' : 'amber'}
          size="sm"
          onClick={() => onToggleServer(activeServer)}
          className="font-semibold shadow-xs"
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 mr-1 fill-current" />
              <span>Stop Server</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1 fill-current" />
              <span>Start Server</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onOpenSettings}
          title="Server Settings"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onNewServer}
          title="Create New Mock Server"
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
