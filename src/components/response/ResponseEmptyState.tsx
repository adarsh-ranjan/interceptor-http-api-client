import React from 'react';

export const ResponseEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#888888] bg-[#1a1a1a] p-8 select-none">
      {/* Bruno Signature Paper Airplane Watermark */}
      <div className="text-[#333333] mb-6 flex justify-center">
        <svg
          className="w-24 h-24 stroke-[#383a42] fill-none"
          viewBox="0 0 24 24"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>

      {/* Keyboard Shortcuts List */}
      <div className="flex text-xs">
        <div className="flex flex-col items-end pr-4 space-y-1.5 text-[#888888]">
          <div>Send Request</div>
          <div>New Request</div>
          <div>Edit Environments</div>
        </div>
        <div className="flex flex-col pl-4 space-y-1.5 font-mono text-[#cccccc]">
          <div>⌘ + ↵</div>
          <div>⌘ + N</div>
          <div>⌘ + E</div>
        </div>
      </div>
    </div>
  );
};
