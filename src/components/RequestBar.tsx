import React, { useRef, useState, useEffect } from 'react';
import { HttpMethod, Environment } from '../types';
import { isCurlCommand, parseCurlCommand, ParsedCurlResult } from '../utils/curlParser';
import {
  extractVariablesFromText,
  findVariableAtCharIndex,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import { HttpMethodDropdown } from './HttpMethodDropdown';
import { Save, Code2 } from 'lucide-react';

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
  const charWidthRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-2 bg-[#1a1a1a] w-full relative select-none">
      {/* Bruno-Style Integrated URL Input Box (QueryUrl) */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center bg-[#1a1a1a] border border-[#333333] rounded-md px-3 h-[34px] focus-within:border-[#444444] transition-colors"
      >
        {/* Method Label Button (Directly inside on the left, no borders, no chevron) */}
        <HttpMethodDropdown
          variant="bare"
          method={method}
          onChange={(m) => onMethodChange(m as HttpMethod)}
          anchorRef={containerRef}
          className="mr-2.5"
        />

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
