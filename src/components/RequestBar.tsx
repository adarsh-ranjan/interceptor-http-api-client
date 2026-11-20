import React, { useRef, useState, useEffect } from 'react';
import { HttpMethod, Environment } from '../types';
import { getMethodColor } from '../utils/http';
import { isCurlCommand, parseCurlCommand, ParsedCurlResult } from '../utils/curlParser';
import {
  extractVariablesFromText,
  findVariableAtCharIndex,
  resolveVariableInfo,
  VariableMatch,
  VariableResolutionInfo,
} from '../utils/variables';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import { Send, XCircle, ChevronDown, Bookmark, Code2, Terminal, Braces } from 'lucide-react';

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

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

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
  const sendShortcut = isMac ? '⌘↵' : 'Ctrl+↵';
  const saveShortcut = isMac ? '⌘S' : 'Ctrl+S';

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
    const paddingLeft = parseFloat(style.paddingLeft) || 14;

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

  const handleBadgeHover = (e: React.MouseEvent<HTMLDivElement>, vMatch: VariableMatch) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const info = resolveVariableInfo(vMatch.varName, activeEnvironment, environments);
    setHoveredVar({
      info,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
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
          <span key={`plain-${lastIndex}`}>
            {url.substring(lastIndex, v.startIndex)}
          </span>
        );
      }

      const info = resolveVariableInfo(v.varName, activeEnvironment, environments);
      elements.push(
        <span
          key={`var-${v.startIndex}-${idx}`}
          className={`rounded px-0.5 -mx-0.5 ${
            info.isResolved
              ? 'bg-amber-500/15 border border-amber-500/30'
              : 'bg-rose-500/15 border border-rose-500/30'
          }`}
        >
          {v.fullMatch}
        </span>
      );
      lastIndex = v.endIndex;
    });

    if (lastIndex < url.length) {
      elements.push(
        <span key={`plain-${lastIndex}`}>
          {url.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  const methodColor = getMethodColor(method);

  return (
    <div className="flex items-center gap-2 p-2 bg-[#161b22] border-b border-[#30363d] w-full relative">
      {/* Method Dropdown */}
      <div className="relative group shrink-0">
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          disabled={isLoading}
          className={`appearance-none font-mono font-bold text-xs uppercase pl-3 pr-7 py-2 rounded-l-md border border-[#30363d] bg-[#0d1117] cursor-pointer focus:outline-none focus:border-sky-500 transition-colors ${methodColor.text}`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} className="bg-[#161b22] text-slate-200 font-sans">
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
      </div>

      {/* URL Input Bar */}
      <div className="flex-1 relative flex items-center bg-[#0d1117] border border-[#30363d] rounded-r-md overflow-hidden focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all">
        {/* Synchronized Variable Highlight Backdrop */}
        <div
          ref={backdropRef}
          className="absolute inset-0 pointer-events-none flex items-center overflow-hidden pl-3.5 pr-28 py-2 text-xs font-mono whitespace-pre select-none text-transparent"
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
          placeholder="Enter request URL or paste cURL (e.g. {{baseUrl}}/posts)"
          className="w-full bg-transparent pl-3.5 pr-28 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all z-10"
        />

        {/* Right Badges: Variables Counter & cURL Indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20">
          {variablesInUrl.length > 0 && (
            <div
              className="pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors"
              title={`${variablesInUrl.length} environment variable${variablesInUrl.length > 1 ? 's' : ''} in URL (hover to inspect)`}
              onMouseEnter={(e) => handleBadgeHover(e, variablesInUrl[0])}
              onMouseLeave={handleMouseLeave}
            >
              <Braces className="w-2.5 h-2.5 text-amber-400" />
              <span>{variablesInUrl.length === 1 ? variablesInUrl[0].varName : `${variablesInUrl.length} vars`}</span>
            </div>
          )}

          <div className="pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-[#21262d] border border-[#30363d]">
            <Terminal className="w-2.5 h-2.5 text-sky-400" />
            <span>cURL</span>
          </div>
        </div>
      </div>

      {/* Code Snippet Button */}
      <button
        type="button"
        onClick={onOpenCodeSnippet}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-[#30363d] bg-[#0d1117] text-slate-300 hover:bg-[#21262d] hover:text-white transition-all shrink-0 cursor-pointer"
        title="Generate code snippet (cURL, Python, JS, Go)"
      >
        <Code2 className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden sm:inline">Code</span>
      </button>

      {/* Save Button */}
      <button
        type="button"
        onClick={onSave}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-all shrink-0 cursor-pointer ${
          isDirty
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
            : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:bg-[#21262d] hover:text-white'
        }`}
        title={`Save request (${saveShortcut})`}
      >
        <Bookmark className={`w-3.5 h-3.5 ${isDirty ? 'text-amber-400 fill-amber-400/30' : 'text-slate-400'}`} />
        <span>Save</span>
        <span className="text-[10px] opacity-60 font-mono ml-0.5">{saveShortcut}</span>
      </button>

      {/* Send or Cancel Button */}
      {isLoading ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all animate-pulse shrink-0 cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all hover:shadow-sky-500/20 shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
          <span className="text-[10px] opacity-75 font-mono ml-0.5">{sendShortcut}</span>
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
