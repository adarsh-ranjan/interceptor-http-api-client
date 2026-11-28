import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  targetName: string;
  subtitle?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  targetName,
  subtitle,
  confirmLabel,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-[#222224] border border-[#333333] rounded-lg shadow-2xl p-4 text-xs">
        <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{title}</span>
        </div>
        <p className="text-[#cccccc] leading-relaxed">
          Are you sure you want to delete <strong className="text-white">"{targetName}"</strong>?
        </p>
        {subtitle && <p className="text-[#888888] text-[11px] mt-1">{subtitle}</p>}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
