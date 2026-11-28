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
import { Button } from './ui/button';
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

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const variablesInUrl = extractVariablesFromText(url);

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
    const pastedText = e.clipboardData.getData('text');
    if (isCurlCommand(pastedText)) {
      e.preventDefault();
      const parsed = parseCurlCommand(pastedText);
      onMethodChange(parsed.method);
      onUrlChange(parsed.url);
      if (onImportCurl) {
        onImportCurl(parsed);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUrlChange(e.target.value);
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const handleScroll = () => {
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!inputRef.current || variablesInUrl.length === 0) return;

    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const mouseX = e.clientX - rect.left - paddingLeft + input.scrollLeft;

    const charWidth = getCharWidth(input);
    const charIndex = Math.floor(mouseX / charWidth);

    const matchedVar = findVariableAtCharIndex(url, charIndex);
    if (matchedVar) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      const info = resolveVariableInfo(matchedVar, activeEnvironment, environments);
      const targetX = Math.min(window.innerWidth - 320, Math.max(16, e.clientX - 60));
      const targetY = rect.bottom + 8;
      setHoveredVar({ info, x: targetX, y: targetY });
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
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVar(null);
    }, 150);
  };

  const renderHighlightedBackdrop = () => {
    if (variablesInUrl.length === 0) return null;

    const regex = /\{\{([^}]+)\}\}/g;
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(url)) !== null) {
      if (match.index > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`} className="text-foreground">
            {url.substring(lastIndex, match.index)}
          </span>
        );
      }

      const varName = match[1].trim();
      const info = resolveVariableInfo(varName, activeEnvironment, environments);
      const pillClass = info.isResolved
        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-semibold rounded px-1'
        : 'bg-rose-950/40 text-rose-400 border border-rose-800/40 font-semibold rounded px-1';

      segments.push(
        <span key={`var-${match.index}`} className={pillClass}>
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < url.length) {
      segments.push(
        <span key={`text-${lastIndex}`} className="text-foreground">
          {url.substring(lastIndex)}
        </span>
      );
    }

    return segments;
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2 p-2 bg-[#141517] relative select-none">
      {/* Integrated Single-Box Request Bar */}
      <div className="flex-1 flex items-center bg-[#1a1b1e] border border-border rounded-md px-2 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs transition-colors h-[34px]">
        {/* Custom Method Dropdown */}
        <div className="shrink-0 mr-2 border-r border-border pr-2">
          <HttpMethodDropdown method={method} onChange={onMethodChange} />
        </div>

        {/* Input & Highlight Backdrop */}
        <div className="flex-1 relative flex items-center overflow-hidden h-full">
          {variablesInUrl.length > 0 && (
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="absolute inset-0 flex items-center pointer-events-none overflow-x-hidden whitespace-pre text-xs font-mono"
            >
              {renderHighlightedBackdrop()}
            </div>
          )}

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
            placeholder="Enter URL or paste a cURL command..."
            className={`w-full bg-transparent pl-0.5 pr-16 text-xs font-mono outline-none z-10 ${
              variablesInUrl.length > 0
                ? 'text-transparent caret-white'
                : 'text-foreground placeholder:text-muted-foreground'
            }`}
          />
        </div>

        {/* Actions inside box: Code Snippet & Save */}
        <div className="flex items-center gap-1 shrink-0 ml-1.5 z-20">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenCodeSnippet}
            title="Generate Code Snippet (cURL, Python, JS, Go)"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Code2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSave}
            title={isDirty ? `Save Request (${saveShortcut}) • Unsaved changes` : `Save Request (${saveShortcut})`}
            className={`h-6 w-6 relative ${
              isDirty ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isDirty && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary shadow-xs" />
            )}
          </Button>
        </div>
      </div>

      {/* Primary Send / Cancel Button */}
      {isLoading ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onCancel}
          className="h-[34px] px-4 animate-pulse font-medium"
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="amber"
          size="sm"
          onClick={onSend}
          className="h-[34px] px-5 font-semibold text-black"
        >
          Send
        </Button>
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
