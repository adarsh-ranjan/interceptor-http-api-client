import React from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  containerClassName?: string;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  containerClassName = 'w-full max-w-md',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className={`${containerClassName} bg-[#222224] border border-[#333333] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-[#cccccc] font-semibold text-sm">
            {icon}
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
