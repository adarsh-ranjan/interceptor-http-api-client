import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Environment } from '../types';
import {
  extractVariablesFromText,
  findVariableInMultilineText,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import {
  Sparkles,
  Minimize2,
  Copy,
  Check,
  Trash2,
  Code2,
  CheckCircle2,
  AlertCircle,
  WrapText,
  FoldHorizontal,
  Braces,
} from 'lucide-react';
import { JsonSyntaxViewer } from './JsonSyntaxViewer';

interface JsonBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
}

export const JsonBodyEditor: React.FC<JsonBodyEditorProps> = ({
  value,
  onChange,
  placeholder = '{\n  "title": "New Post",\n  "userId": 1\n}',
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'tree'>('edit');
  const [isWrapEnabled, setIsWrapEnabled] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [hoveredVar, setHoveredVar] = useState<{
    info: VariableResolutionInfo;
    x: number;
    y: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charWidthRef = useRef<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const variablesInBody = useMemo(() => extractVariablesFromText(value), [value]);

  // Validate JSON syntax
  const validation = useMemo(() => {
    if (!value.trim()) {
      return { isValid: true, message: 'Empty body' };
    }
    try {
      const parsed = JSON.parse(value);
      return { isValid: true, message: 'Valid JSON', parsed };
    } catch (err: any) {
      let msg = err.message || 'Syntax Error';
      // Clean up common error prefixes
      msg = msg.replace(/^JSON\.parse:\s*/, '');
      return { isValid: false, message: msg };
    }
  }, [value]);

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2000);
  };

  // Prettify JSON with 2 spaces
  const handlePrettify = () => {
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      showFeedback('Prettified');
    } catch (e: any) {
      showFeedback(`Format failed: ${e.message}`);
    }
  };

  // Minify JSON to single line
  const handleMinify = () => {
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      const minified = JSON.stringify(parsed);
      onChange(minified);
      showFeedback('Minified');
    } catch (e: any) {
      showFeedback(`Minify failed: ${e.message}`);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear content
  const handleClear = () => {
    onChange('');
    showFeedback('Cleared');
    textareaRef.current?.focus();
  };

  // Synchronize scrolling between textarea, highlighted layer, and line gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  // Handle Tab key and Enter key (indentation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
      return;
    }

    if (e.key === 'Enter') {
      const start = e.currentTarget.selectionStart;
      const beforeCursor = value.substring(0, start);
      const currentLine = beforeCursor.split('\n').pop() || '';
      const matchIndent = currentLine.match(/^\s*/);
      const currentIndent = matchIndent ? matchIndent[0] : '';
      const extraIndent =
        currentLine.trim().endsWith('{') || currentLine.trim().endsWith('[') ? '  ' : '';
      const newIndent = currentIndent + extraIndent;

      if (newIndent.length > 0) {
        e.preventDefault();
        const afterCursor = value.substring(start);
        const insertText = '\n' + newIndent;
        onChange(beforeCursor + insertText + afterCursor);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
              start + insertText.length;
          }
        });
      }
    }
  };

  // Measure character width for monospace textarea
  const getCharWidth = (el: HTMLTextAreaElement): number => {
    if (charWidthRef.current > 0) return charWidthRef.current;
    try {
      const style = window.getComputedStyle(el);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current || !value) return;
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const paddingLeft = parseFloat(style.paddingLeft) || 10;
    const paddingTop = parseFloat(style.paddingTop) || 10;
    const lineHeight = parseFloat(style.lineHeight) || 20;

    const charWidth = getCharWidth(textarea);
    if (charWidth <= 0) return;

    const mouseX = e.clientX - rect.left - paddingLeft + textarea.scrollLeft;
    const mouseY = e.clientY - rect.top - paddingTop + textarea.scrollTop;

    if (mouseX < 0 || mouseY < 0) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setHoveredVar(null), 100);
      return;
    }

    const lineIndex = Math.floor(mouseY / lineHeight);
    const charInLine = Math.floor(mouseX / charWidth);

    const matched = findVariableInMultilineText(value, lineIndex, charInLine);
    if (matched) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
      setHoveredVar({
        info,
        x: Math.min(window.innerWidth - 340, Math.max(16, e.clientX - 100)),
        y: Math.min(window.innerHeight - 180, e.clientY + 14),
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

  // Helper to highlight variables in JSON tokens
  const renderTokenWithVariables = (text: string, defaultClass: string, keyPrefix: string) => {
    const vars = extractVariablesFromText(text);
    if (vars.length === 0) {
      return (
        <span key={keyPrefix} className={defaultClass}>
          {text}
        </span>
      );
    }
    const parts: React.ReactNode[] = [];
    let last = 0;
    vars.forEach((v, vIdx) => {
      if (v.startIndex > last) {
        parts.push(
          <span key={`${keyPrefix}-p-${last}`} className={defaultClass}>
            {text.substring(last, v.startIndex)}
          </span>
        );
      }
      const info = resolveVariableInfo(v.varName, activeEnvironment, environments);
      parts.push(
        <span
          key={`${keyPrefix}-var-${v.startIndex}-${vIdx}`}
          className={`rounded px-1 font-semibold ${info.isResolved
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
        >
          {v.fullMatch}
        </span>
      );
      last = v.endIndex;
    });
    if (last < text.length) {
      parts.push(
        <span key={`${keyPrefix}-end`} className={defaultClass}>
          {text.substring(last)}
        </span>
      );
    }
    return <React.Fragment key={keyPrefix}>{parts}</React.Fragment>;
  };

  // Tokenize a single line of JSON for Postman styling
  const renderLineTokens = (line: string) => {
    const tokenRegex =
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let tokenIdx = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index === tokenRegex.lastIndex) {
        tokenRegex.lastIndex++;
      }

      if (match.index > lastIndex) {
        parts.push(
          <span key={`gap-${tokenIdx}`} className="text-slate-300">
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const token = match[0];
      const pKey = `tok-${tokenIdx++}`;

      if (token.endsWith(':')) {
        // Property Key (e.g. "title":)
        const colonIdx = token.lastIndexOf(':');
        const keyPart = token.substring(0, colonIdx);
        const colonPart = token.substring(colonIdx);

        parts.push(renderTokenWithVariables(keyPart, 'text-[#61afef] font-normal', `${pKey}-k`));
        parts.push(
          <span key={`${pKey}-col`} className="text-[#888888] font-normal">
            {colonPart}
          </span>
        );
      } else if (token.startsWith('"')) {
        // String Value
        parts.push(renderTokenWithVariables(token, 'text-[#e5c07b] font-normal', pKey));
      } else if (token === 'true' || token === 'false') {
        // Boolean
        parts.push(
          <span key={pKey} className="text-[#ef596f] font-normal">
            {token}
          </span>
        );
      } else if (token === 'null') {
        // Null
        parts.push(
          <span key={pKey} className="text-[#ef596f] font-normal">
            {token}
          </span>
        );
      } else if (/^-?\d/.test(token)) {
        // Number
        parts.push(
          <span key={pKey} className="text-[#d19a66] font-mono font-normal">
            {token}
          </span>
        );
      } else if (token === '{' || token === '}' || token === '[' || token === ']') {
        // Brackets & Braces
        parts.push(
          <span key={pKey} className="text-[#abb2bf] font-normal">
            {token}
          </span>
        );
      } else if (token === ',') {
        // Comma
        parts.push(
          <span key={pKey} className="text-[#888888] font-normal">
            {token}
          </span>
        );
      } else {
        parts.push(renderTokenWithVariables(token, 'text-[#abb2bf]', pKey));
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key="end" className="text-slate-300">
          {line.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const lines = useMemo(() => value.split('\n'), [value]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-xs font-mono select-text overflow-hidden">
      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden flex bg-[#1a1a1a]">
        {viewMode === 'edit' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Gutter with Line Numbers and Fold Carets (NO vertical line, matches Image 2) */}
            <div
              ref={gutterRef}
              className="w-10 shrink-0 pt-4 pb-4 pl-3 pr-1 select-none font-mono text-xs leading-5 text-[#666666] bg-[#1a1a1a] overflow-hidden"
            >
              {lines.map((line, i) => {
                const trimmed = line.trim();
                const canFold =
                  trimmed.endsWith('{') ||
                  trimmed.endsWith('[') ||
                  /[{\[]\s*$/.test(trimmed);
                return (
                  <div key={i} className="h-5 flex items-center justify-between">
                    <span className="w-5 text-left text-[#666666]">{i + 1}</span>
                    <span className="w-3 text-center text-[#666666] text-[10px] select-none">
                      {canFold ? '▾' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Code Input Area with Real-Time Syntax Highlight Overlay */}
            <div className="relative flex-1 h-full overflow-hidden">
              {/* Underlying Syntax-Highlighted Layer */}
              <div
                ref={preRef}
                aria-hidden="true"
                className={`absolute inset-0 pt-4 pb-4 pl-2 pr-4 font-mono text-xs leading-5 pointer-events-none select-none overflow-hidden ${isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
              >
                {lines.map((line, idx) => (
                  <div key={idx} className="h-5">
                    {renderLineTokens(line)}
                    {line === '' && <span>&nbsp;</span>}
                  </div>
                ))}
              </div>

              {/* Textarea for Keystroke Input & Caret */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setHoveredVar(null);
                  onChange(e.target.value);
                }}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className={`relative z-10 w-full h-full pt-4 pb-4 pl-2 pr-4 font-mono text-xs leading-5 bg-transparent resize-none outline-none overflow-auto selection:bg-[#d99b26]/30 selection:text-transparent ${value ? 'text-transparent caret-[#d99b26]' : 'text-[#cccccc] placeholder:text-[#555555]'
                  } ${isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}
              />
            </div>
          </div>
        ) : (
          /* Tree View with Collapsible Folding & Search (uses JsonSyntaxViewer) */
          <div className="flex-1 h-full overflow-hidden">
            <JsonSyntaxViewer
              data={validation.isValid ? (validation as any).parsed : undefined}
              rawText={value}
              onCopy={handleCopy}
            />
          </div>
        )}
      </div>

      {/* Variable Hover Tooltip */}
      {hoveredVar && (
        <VariableHoverTooltip
          info={hoveredVar.info}
          x={hoveredVar.x}
          y={hoveredVar.y}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            setHoveredVar(null);
          }}
          onOpenEnvModal={onOpenEnvironmentModal}
        />
      )}
    </div>
  );
};
