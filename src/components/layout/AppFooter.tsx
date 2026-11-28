import React from 'react';
import { Settings, Key, GitFork, Sparkles, Search, Cookie, Terminal } from 'lucide-react';
import { Button } from '../ui/button';

interface AppFooterProps {
  onOpenEnvModal: () => void;
  onShowToast: (toast: { type: 'info' | 'success' | 'error'; title: string; message: string }) => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenEnvModal,
  onShowToast,
}) => {
  return (
    <footer className="h-6 bg-card border-t border-border text-[11px] text-muted-foreground flex items-center justify-between px-3 select-none shrink-0 z-30">
      {/* Left: Preferences, Shortcuts, Git, Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenEnvModal}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Preferences & Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenEnvModal}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Environment Variables (⌘E)"
        >
          <Key className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.open?.('https://github.com/usebruno/bruno', '_blank')}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="GitHub Repository"
        >
          <GitFork className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1 text-amber-500 font-medium cursor-pointer hover:underline text-[11px]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Try Interceptor Pro</span>
        </div>
      </div>

      {/* Right: Search, Cookies, Dev Tools, Version */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onShowToast({ type: 'info', title: 'Global Search', message: 'Press ⌘F to search across requests' })}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3" />
          <span>Search</span>
        </button>

        <button
          onClick={() => onShowToast({ type: 'info', title: 'Cookie Manager', message: 'Cookie store synchronized.' })}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Cookie className="w-3 h-3" />
          <span>Cookies</span>
        </button>

        <button
          onClick={() => {
            if ((window as any).interceptor?.openDevTools) {
              (window as any).interceptor.openDevTools();
            } else {
              onShowToast({ type: 'info', title: 'Dev Tools', message: 'Developer tools available in Electron.' });
            }
          }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Terminal className="w-3 h-3" />
          <span>Dev Tools</span>
        </button>

        <div className="w-px h-3 bg-border" />
        <span className="font-mono text-muted-foreground/60 text-[10px]">v{__APP_VERSION__}</span>
      </div>
    </footer>
  );
};
