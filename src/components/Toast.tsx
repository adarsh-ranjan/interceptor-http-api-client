import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-orange-400 shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-500/40 bg-[#222224]/95 text-[#cccccc] shadow-emerald-500/10',
    error: 'border-rose-500/40 bg-[#222224]/95 text-[#cccccc] shadow-rose-500/10',
    info: 'border-[#d99b26]/40 bg-[#222224]/95 text-[#cccccc] shadow-[#d99b26]/10',
  };

  return (
    <aside
      aria-label="Notification"
      aria-live="polite"
      className="fixed bottom-8 right-5 z-50 flex items-start gap-3 p-3 max-w-sm rounded-md border border-[#333333] bg-[#222224] shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 select-none"
    >
      <div className="flex items-start gap-3 w-full">
        {iconMap[toast.type]}
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-white leading-tight truncate">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-[11px] text-[#888888] font-mono mt-0.5 break-all">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#888888] hover:text-white transition-colors p-0.5 -mr-1 -mt-1 rounded hover:bg-[#26292b] cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
