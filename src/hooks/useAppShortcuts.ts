import { useEffect } from 'react';
import { RequestProtocol } from '../types';

interface UseAppShortcutsOptions {
  activeProtocol: RequestProtocol;
  tabsCount: number;
  onSend: () => void;
  onSave: () => void;
  onNewTab: () => void;
  onCloseActiveTab: () => void;
  onToggleSidebar: () => void;
}

export function useAppShortcuts({
  activeProtocol,
  tabsCount,
  onSend,
  onSave,
  onNewTab,
  onCloseActiveTab,
  onToggleSidebar,
}: UseAppShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === 'Enter') {
        if (activeProtocol === 'http') {
          e.preventDefault();
          onSend();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onSave();
          break;
        case 't':
          e.preventDefault();
          onNewTab();
          break;
        case 'w':
          if (tabsCount > 1) {
            e.preventDefault();
            onCloseActiveTab();
          }
          break;
        case 'b':
          e.preventDefault();
          onToggleSidebar();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProtocol, tabsCount, onSend, onSave, onNewTab, onCloseActiveTab, onToggleSidebar]);
}
