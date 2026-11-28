import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { HttpMethod } from '../types';
import { getMethodColor } from '../utils/http';
import { PortalMenu } from './PortalMenu';

export const STANDARD_HTTP_METHODS: string[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
  'TRACE',
  'CONNECT',
];

export interface HttpMethodDropdownProps {
  method: string;
  onChange: (method: string) => void;
  options?: string[];
  includeAll?: boolean;
  allowCustom?: boolean;
  variant?: 'button' | 'bare';
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  align?: 'left' | 'right';
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const HttpMethodDropdown: React.FC<HttpMethodDropdownProps> = ({
  method,
  onChange,
  options,
  includeAll = false,
  allowCustom = true,
  variant = 'button',
  className = '',
  size = 'md',
  disabled = false,
  align = 'left',
  anchorRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const triggerRef = useRef<HTMLButtonElement>(null);

  const methodsList = useMemo(() => {
    if (options && options.length > 0) return options;
    if (includeAll) {
      return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];
    }
    return STANDARD_HTTP_METHODS;
  }, [options, includeAll]);

  const upperMethod = (method || 'GET').toUpperCase();
  const isCustomMethod = allowCustom && !methodsList.includes(upperMethod);
  const methodColor = getMethodColor(upperMethod as HttpMethod);

  const closeMenu = () => {
    setIsOpen(false);
    setIsAddingCustom(false);
  };

  const toggleMenu = () => {
    if (disabled) return;
    if (isOpen) {
      closeMenu();
      return;
    }

    const anchorEl = anchorRef?.current || triggerRef.current;
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const menuWidth = 144;
      let left = align === 'right' ? rect.right - menuWidth : rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      if (left < 10) left = 10;

      setMenuPos({ top: rect.bottom + 4, left });
      setIsOpen(true);
      setIsAddingCustom(false);
    }
  };

  const handleSelectMethod = (selected: string) => {
    onChange(selected);
    closeMenu();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim().toUpperCase();
    if (trimmed) {
      onChange(trimmed);
      setCustomInput('');
      closeMenu();
    }
  };

  return (
    <>
      {variant === 'bare' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggleMenu}
          className={`font-mono font-bold text-xs uppercase cursor-pointer hover:opacity-80 transition-opacity select-none shrink-0 ${methodColor.text} ${className}`}
          title="Change HTTP method"
        >
          {upperMethod}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggleMenu}
          className={`flex items-center gap-1.5 ${
            size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
          } bg-[#1a1a1a] hover:bg-[#222224] border border-[#333333] hover:border-[#444444] rounded font-mono font-bold ${
            methodColor.text
          } transition-colors cursor-pointer select-none shrink-0 focus:outline-none focus:border-[#d99b26] ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className}`}
          title="Change HTTP method"
        >
          <span>{upperMethod}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 text-[#888888]" />
        </button>
      )}

      <PortalMenu
        isOpen={isOpen}
        position={menuPos}
        onClose={closeMenu}
        triggerRef={triggerRef}
        className="w-36 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        {methodsList.map((m) => {
          const isSelected = upperMethod === m;
          const itemColor = getMethodColor(m as HttpMethod);
          return (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectMethod(m)}
              className={`w-full flex items-center justify-between px-3 py-1.5 font-mono text-xs text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'text-white bg-[#26292b] font-semibold'
                  : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
              }`}
            >
              <span className={isSelected ? 'text-white font-bold' : itemColor.text}>{m}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />}
            </button>
          );
        })}

        {isCustomMethod && (
          <div className="w-full flex items-center justify-between px-3 py-1.5 font-mono text-xs text-white bg-[#26292b] font-semibold border-t border-[#333333]">
            <span className="truncate">{upperMethod}</span>
            <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
          </div>
        )}

        {allowCustom && (
          <>
            <div className="my-1 border-t border-[#333333]" />
            {isAddingCustom ? (
              <form onSubmit={handleCustomSubmit} className="px-2.5 py-1 flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="METHOD"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#d99b26] rounded px-1.5 py-0.5 text-xs font-mono uppercase text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-1.5 py-0.5 bg-[#d99b26] hover:bg-[#c2871a] text-white rounded text-xs font-bold cursor-pointer"
                >
                  ✓
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="w-full flex items-center px-3 py-1.5 text-[#888888] hover:text-[#d99b26] hover:bg-[#26292b] font-mono text-xs text-left transition-colors cursor-pointer"
              >
                + Add Custom
              </button>
            )}
          </>
        )}
      </PortalMenu>
    </>
  );
};
