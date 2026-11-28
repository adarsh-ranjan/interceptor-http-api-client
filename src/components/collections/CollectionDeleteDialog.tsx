import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CollectionDeleteDialogProps {
  title: string;
  description: string;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CollectionDeleteDialog: React.FC<CollectionDeleteDialogProps> = ({
  title,
  description,
  name,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[380px] bg-[#1e1e20] border border-[#333333] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs text-[#cccccc]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="text-[#888888] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-slate-300">
            {description}: <strong className="text-white font-mono">{name}</strong>?
          </p>
          <p className="text-[11px] text-[#777777]">
            This action cannot be undone. All child folders and requests will be deleted.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#1a1a1a] border-t border-[#333333]">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded hover:bg-[#26292b] text-[#888888] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
