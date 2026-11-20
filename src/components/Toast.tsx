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
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-500/40 bg-[#161b22]/95 text-slate-200 shadow-emerald-500/10',
    error: 'border-rose-500/40 bg-[#161b22]/95 text-slate-200 shadow-rose-500/10',
    info: 'border-sky-500/40 bg-[#161b22]/95 text-slate-200 shadow-sky-500/10',
  };

  return (
    <aside
      aria-label="Notification"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-start gap-3 p-3.5 max-w-sm rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 select-none"
    >
      <div className={`flex items-start gap-3 w-full ${borderMap[toast.type]}`}>
        {iconMap[toast.type]}
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-slate-100 leading-tight truncate">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 break-all">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 -mr-1 -mt-1 rounded hover:bg-[#30363d]/50"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
