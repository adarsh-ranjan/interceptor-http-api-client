import React, { useMemo, useRef, useState } from 'react';
import { Environment } from '../types';
import { extractVariablesFromText, resolveVariableInfo } from '../utils/variables';
import { tokenizeJsonLine } from '../utils/jsonTokenizer';
import { useClipboard } from '../hooks/useClipboard';
import { useVariableHover } from '../hooks/useVariableHover';
import { VariableHoverTooltip } from './VariableHoverTooltip';
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
  const [viewMode] = useState<'edit' | 'tree'>('edit');
  const [isWrapEnabled] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const { copy } = useClipboard();
  const {
    hoveredVar,
    clearHoveredVar,
    handleMultilineMouseMove,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useVariableHover({ activeEnvironment, environments });

  const validation = useMemo(() => {
    if (!value.trim()) {
      return { isValid: true, message: 'Empty body', parsed: undefined as unknown };
    }
    try {
      const parsed = JSON.parse(value);
      return { isValid: true, message: 'Valid JSON', parsed };
    } catch (err: any) {
      const msg = (err.message || 'Syntax Error').replace(/^JSON\.parse:\s*/, '');
      return { isValid: false, message: msg, parsed: undefined as unknown };
    }
  }, [value]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      onChange(value.substring(0, start) + '  ' + value.substring(end));
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
          className={`rounded px-1 font-semibold ${
            info.isResolved
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

  const renderLineTokens = (line: string) =>
    tokenizeJsonLine(line).map((token, idx) => {
      const pKey = `tok-${idx}`;
      switch (token.type) {
        case 'gap':
          return (
            <span key={pKey} className="text-slate-300">
              {token.value}
            </span>
          );
        case 'key':
          return renderTokenWithVariables(token.value, 'text-[#61afef] font-normal', `${pKey}-k`);
        case 'colon':
          return (
            <span key={`${pKey}-col`} className="text-[#888888] font-normal">
              {token.value}
            </span>
          );
        case 'string':
          return renderTokenWithVariables(token.value, 'text-[#e5c07b] font-normal', pKey);
        case 'boolean':
        case 'null':
          return (
            <span key={pKey} className="text-[#ef596f] font-normal">
              {token.value}
            </span>
          );
        case 'number':
          return (
            <span key={pKey} className="text-[#d19a66] font-mono font-normal">
              {token.value}
            </span>
          );
        case 'bracket':
          return (
            <span key={pKey} className="text-[#abb2bf] font-normal">
              {token.value}
            </span>
          );
        case 'comma':
          return (
            <span key={pKey} className="text-[#888888] font-normal">
              {token.value}
            </span>
          );
        default:
          return renderTokenWithVariables(token.value, 'text-[#abb2bf]', pKey);
      }
    });

  const lines = useMemo(() => value.split('\n'), [value]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-xs font-mono select-text overflow-hidden">
      <div className="flex-1 relative overflow-hidden flex bg-[#1a1a1a]">
        {viewMode === 'edit' ? (
          <div className="flex-1 flex overflow-hidden">
            <div
              ref={gutterRef}
              className="w-10 shrink-0 pt-4 pb-4 pl-3 pr-1 select-none font-mono text-xs leading-5 text-[#666666] bg-[#1a1a1a] overflow-hidden"
            >
              {lines.map((line, i) => {
                const trimmed = line.trim();
                const canFold =
                  trimmed.endsWith('{') || trimmed.endsWith('[') || /[{\[]\s*$/.test(trimmed);
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

            <div className="relative flex-1 h-full overflow-hidden">
              <div
                ref={preRef}
                aria-hidden="true"
                className={`absolute inset-0 pt-4 pb-4 pl-2 pr-4 font-mono text-xs leading-5 pointer-events-none select-none overflow-hidden ${
                  isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              >
                {lines.map((line, idx) => (
                  <div key={idx} className="h-5">
                    {renderLineTokens(line)}
                    {line === '' && <span>&nbsp;</span>}
                  </div>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  clearHoveredVar();
                  onChange(e.target.value);
                }}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onMouseMove={(e) => handleMultilineMouseMove(e, value)}
                onMouseLeave={handleMouseLeave}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className={`relative z-10 w-full h-full pt-4 pb-4 pl-2 pr-4 font-mono text-xs leading-5 bg-transparent resize-none outline-none overflow-auto selection:bg-[#d99b26]/30 selection:text-transparent ${
                  value ? 'text-transparent caret-[#d99b26]' : 'text-[#cccccc] placeholder:text-[#555555]'
                } ${isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full overflow-hidden">
            <JsonSyntaxViewer
              data={validation.isValid ? validation.parsed : undefined}
              rawText={value}
              onCopy={() => value && copy(value)}
            />
          </div>
        )}
      </div>

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
