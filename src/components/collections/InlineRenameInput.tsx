import React from 'react';

interface InlineRenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const InlineRenameInput: React.FC<InlineRenameInputProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
}) => (
  <div className="flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave();
        if (e.key === 'Escape') onCancel();
      }}
      autoFocus
      onFocus={(e) => e.target.select()}
      className="w-full bg-[#1a1a1a] border border-[#d99b26] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
    />
  </div>
);
