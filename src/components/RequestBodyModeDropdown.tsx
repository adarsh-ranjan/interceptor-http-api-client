import React, { useRef, useState } from 'react';
import { BodyType } from '../types';
import { AlignLeft, Braces, Check, Files, FileText, FileUp, X } from 'lucide-react';
import { PortalMenu } from './PortalMenu';

interface RequestBodyModeDropdownProps {
  bodyMode: BodyType;
  onModeChange: (mode: BodyType) => void;
  onPrettify?: () => void;
}

export function humanizeRequestBodyMode(mode: BodyType): string {
  switch (mode) {
    case 'none':
      return 'No Body';
    case 'json':
      return 'JSON';
    case 'form-data':
      return 'Multipart Form';
    case 'urlencoded':
      return 'Form URL Encoded';
    case 'text':
      return 'TEXT';
    case 'binary':
      return 'File / Binary';
    default:
      return 'No Body';
  }
}

interface ModeOption {
  id: BodyType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODE_GROUPS: { name: string; options: ModeOption[] }[] = [
  {
    name: 'FORM',
    options: [
      { id: 'form-data', label: 'Multipart Form', icon: Files },
      { id: 'urlencoded', label: 'Form URL Encoded', icon: AlignLeft },
    ],
  },
  {
    name: 'RAW',
    options: [
      { id: 'json', label: 'JSON', icon: Braces },
      { id: 'text', label: 'TEXT', icon: FileText },
    ],
  },
  {
    name: 'OTHER',
    options: [
      { id: 'binary', label: 'File / Binary', icon: FileUp },
      { id: 'none', label: 'No Body', icon: X },
    ],
  },
];

export const RequestBodyModeDropdown: React.FC<RequestBodyModeDropdownProps> = ({
  bodyMode,
  onModeChange,
  onPrettify,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 190;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      setMenuPos({ top: rect.bottom + 4, left });
      setIsOpen(true);
    }
  };

  const isPrettifyVisible = bodyMode === 'json';

  return (
    <div className="flex items-center gap-3 select-none text-xs">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-1 font-medium text-xs text-[#d99b26] hover:text-[#e5a730] transition-colors cursor-pointer"
        title="Change Body Mode"
      >
        <span>{humanizeRequestBodyMode(bodyMode)}</span>
        <span className="text-[#888888] text-[10px] leading-none select-none">▾</span>
      </button>

      {isPrettifyVisible && onPrettify && (
        <button
          type="button"
          onClick={onPrettify}
          className="text-[#999999] hover:text-white transition-colors cursor-pointer text-xs font-normal"
          title="Format and prettify JSON payload"
        >
          Prettify
        </button>
      )}

      <PortalMenu
        isOpen={isOpen}
        position={menuPos}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        {MODE_GROUPS.map((group, groupIndex) => (
          <div
            key={group.name}
            className={groupIndex > 0 ? 'mt-1 pt-1 border-t border-[#333333]/60' : ''}
          >
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[#777777] uppercase font-sans">
              {group.name}
            </div>
            {group.options.map((option) => {
              const isSelected = bodyMode === option.id;
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onModeChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-white bg-[#26292b] font-medium'
                      : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComponent
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-[#d99b26]' : 'text-[#888888]'}`}
                    />
                    <span>{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </PortalMenu>
    </div>
  );
};
