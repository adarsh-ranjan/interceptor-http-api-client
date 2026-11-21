import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HttpMethod, Environment } from '../types';
import { getMethodColor } from '../utils/http';
import { isCurlCommand, parseCurlCommand, ParsedCurlResult } from '../utils/curlParser';
import {
  extractVariablesFromText,
  findVariableAtCharIndex,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import { Check, Save, Code2 } from 'lucide-react';

interface RequestBarProps {
  method: HttpMethod;
  onMethodChange: (method: HttpMethod) => void;
  url: string;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onSave: () => void;
  onOpenCodeSnippet: () => void;
  onImportCurl?: (parsed: ParsedCurlResult) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
  isLoading: boolean;
  isDirty?: boolean;
}

const BRUNO_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
  'TRACE',
  'CONNECT',
] as const;

export const RequestBar: React.FC<RequestBarProps> = ({
  method,
  onMethodChange,
  url,
  onUrlChange,
  onSend,
  onCancel,
  onSave,
  onOpenCodeSnippet,
  onImportCurl,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
  isLoading,
  isDirty,
}) => {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const saveShortcut = isMac ? '⌘S' : 'Ctrl+S';

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const methodButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const charWidthRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const [hoveredVar, setHoveredVar] = useState<{
    info: VariableResolutionInfo;
    x: number;
    y: number;
  } | null>(null);

  // Clear hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Close method menu on outside click, Escape, or scroll
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      if (methodButtonRef.current && methodButtonRef.current.contains(target)) return;
      setIsMenuOpen(false);
      setIsAddingCustom(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsAddingCustom(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      setIsMenuOpen(false);
      setIsAddingCustom(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isMenuOpen]);

  const toggleMethodMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      setIsAddingCustom(false);
      return;
    }
    // Align menu flush with the left boundary of the request URL bar
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
      setIsMenuOpen(true);
      setIsAddingCustom(false);
    }
  };

  const variablesInUrl = extractVariablesFromText(url);

  // Measure character width for monospace input
  const getCharWidth = (inputEl: HTMLInputElement): number => {
    if (charWidthRef.current > 0) return charWidthRef.current;
    try {
      const style = window.getComputedStyle(inputEl);
      const span = document.createElement('span');
      span.style.font = style.font;
      span.style.fontFamily = style.fontFamily;
      span.style.fontSize = style.fontSize;
      span.style.fontWeight = style.fontWeight;
      span.style.letterSpacing = style.letterSpacing;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      span.textContent = 'M'.repeat(100);
      document.body.appendChild(span);
      const width = span.getBoundingClientRect().width / 100;
      document.body.removeChild(span);
      if (width > 0) {
        charWidthRef.current = width;
        return width;
      }
    } catch {
      // fallback
    }
    return 7.2;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !isLoading)) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (isCurlCommand(text)) {
      e.preventDefault();
      const parsed = parseCurlCommand(text);
      if (parsed) {
        if (onImportCurl) {
          onImportCurl(parsed);
        } else {
          onUrlChange(parsed.url);
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoveredVar(null);
    const val = e.target.value;
    if (isCurlCommand(val)) {
      const parsed = parseCurlCommand(val);
      if (parsed) {
        if (onImportCurl) {
          onImportCurl(parsed);
          return;
        }
      }
    }
    onUrlChange(val);
  };

  const handleScroll = () => {
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const paddingLeft = parseFloat(style.paddingLeft) || 4;

    const charWidth = getCharWidth(input);
    if (charWidth <= 0) return;

    const mouseX = e.clientX - rect.left - paddingLeft + input.scrollLeft;
    if (mouseX < 0) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setHoveredVar(null), 100);
      return;
    }

    const charIndex = Math.floor(mouseX / charWidth);
    const matched = findVariableAtCharIndex(url, charIndex);

    if (matched) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
      const varStartPx = rect.left + paddingLeft + (matched.startIndex * charWidth) - input.scrollLeft;
      const varWidthPx = (matched.endIndex - matched.startIndex) * charWidth;
      const x = varStartPx + varWidthPx / 2;
      const y = rect.bottom + 6;

      setHoveredVar({
        info,
        x,
        y,
      });
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredVar(null);
      }, 120);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVar(null);
    }, 180);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredVar(null);
  };

  const renderBackdropContent = () => {
    if (!url) return null;
    const vars = extractVariablesFromText(url);
    if (vars.length === 0) return null;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    vars.forEach((v, idx) => {
      if (v.startIndex > lastIndex) {
        elements.push(
          <span key={`plain-${lastIndex}`} className="text-slate-100">
            {url.substring(lastIndex, v.startIndex)}
          </span>
        );
      }

      const info = resolveVariableInfo(v.varName, activeEnvironment, environments);
      elements.push(
        <span
          key={`var-${v.startIndex}-${idx}`}
          className={`font-semibold ${
            info.isResolved ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {v.fullMatch}
        </span>
      );
      lastIndex = v.endIndex;
    });

    if (lastIndex < url.length) {
      elements.push(
        <span key={`plain-${lastIndex}`} className="text-slate-100">
          {url.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  const methodColor = getMethodColor(method);
  const isCustomMethod = !BRUNO_METHODS.includes(method as any);

  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-2 bg-[#1a1a1a] w-full relative select-none">
      {/* Bruno-Style Integrated URL Input Box (QueryUrl) */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center bg-[#1a1a1a] border border-[#333333] rounded-md px-3 h-[34px] focus-within:border-[#444444] transition-colors"
      >
        {/* Method Label Button (Directly inside on the left, no borders, no chevron) */}
        <button
          ref={methodButtonRef}
          type="button"
          onClick={toggleMethodMenu}
          className={`font-mono font-bold text-xs uppercase cursor-pointer hover:opacity-80 transition-opacity select-none mr-2.5 shrink-0 ${methodColor.text}`}
          title="Change HTTP method"
        >
          {method}
        </button>

        {/* URL Input with Variable Highlighting */}
        <div className="flex-1 relative flex items-center overflow-hidden h-full">
          <div
            ref={backdropRef}
            className="absolute inset-0 pointer-events-none flex items-center overflow-hidden pl-0.5 pr-16 text-xs font-mono whitespace-pre select-none text-transparent"
            aria-hidden="true"
          >
            {renderBackdropContent()}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onScroll={handleScroll}
            placeholder="Enter URL or paste a cURL request"
            className={`w-full bg-transparent pl-0.5 pr-16 text-xs font-mono outline-none z-10 ${
              variablesInUrl.length > 0 ? 'text-transparent caret-white' : 'text-[#ffffff] placeholder:text-[#666666]'
            }`}
          />
        </div>

        {/* Action Buttons Inside URL Input Box: Code Generator & Save */}
        <div className="flex items-center gap-2 shrink-0 ml-1.5 z-20">
          {/* Code Snippet Button (</>) */}
          <button
            type="button"
            onClick={onOpenCodeSnippet}
            className="p-1 text-[#999999] hover:text-[#cccccc] hover:bg-[#26292b] rounded transition-colors cursor-pointer"
            title="Generate Code Snippet (cURL, Python, JS, Go)"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          {/* Save Button (Floppy disk icon) */}
          <button
            type="button"
            onClick={onSave}
            className={`p-1 rounded transition-colors cursor-pointer relative ${
              isDirty
                ? 'text-[#d99b26] hover:text-[#e5a730]'
                : 'text-[#999999] hover:text-[#cccccc] hover:bg-[#26292b]'
            }`}
            title={isDirty ? `Save Request (${saveShortcut}) • Unsaved changes` : `Save Request (${saveShortcut})`}
          >
            <Save className="w-3.5 h-3.5" />
            {isDirty && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#d99b26] shadow-xs shadow-amber-500/50" />
            )}
          </button>
        </div>
      </div>

      {/* Send or Cancel Button (Outside Input Box) */}
      {isLoading ? (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-medium shadow-sm transition-all animate-pulse shrink-0 cursor-pointer h-[34px]"
        >
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          className="px-5 py-1.5 bg-[#d99b26] hover:bg-[#c48b20] text-white rounded-md text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer h-[34px]"
        >
          Send
        </button>
      )}

      {/* Floating Bruno-style HTTP Method Menu (Aligned flush with input container left) */}
      {isMenuOpen && menuPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            zIndex: 9999,
          }}
          className="w-36 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {BRUNO_METHODS.map((m) => {
            const isSelected = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onMethodChange(m);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 font-mono text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white bg-[#26292b] font-semibold'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
                }`}
              >
                <span>{m}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26]" />}
              </button>
            );
          })}

          {/* If current method is a custom method */}
          {isCustomMethod && (
            <div className="w-full flex items-center justify-between px-3 py-1.5 font-mono text-xs text-white bg-[#26292b] font-semibold border-t border-[#333333]">
              <span className="truncate">{method}</span>
              <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
            </div>
          )}

          <div className="my-1 border-t border-[#333333]" />

          {/* Add Custom Method Option */}
          {isAddingCustom ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customInput.trim()) {
                  onMethodChange(customInput.trim().toUpperCase());
                  setCustomInput('');
                  setIsAddingCustom(false);
                  setIsMenuOpen(false);
                }
              }}
              className="px-2.5 py-1 flex items-center gap-1"
            >
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
                className="px-1.5 py-0.5 bg-[#d99b26] hover:bg-[#c2871a] text-white rounded text-xs font-bold"
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
        </div>,
        document.body
      )}

      {/* Variable Hover Tooltip */}
      {hoveredVar && (
        <VariableHoverTooltip
          info={hoveredVar.info}
          x={hoveredVar.x}
          y={hoveredVar.y}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          onOpenEnvModal={onOpenEnvironmentModal}
        />
      )}
    </div>
  );
};
