import React, { useState, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { JsonSyntaxViewer } from './JsonSyntaxViewer';

interface JsonBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const JsonBodyEditor: React.FC<JsonBodyEditorProps> = ({
  value,
  onChange,
  placeholder = '{\n  "title": "New Post",\n  "userId": 1\n}',
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'tree'>('edit');
  const [isWrapEnabled, setIsWrapEnabled] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

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

        parts.push(
          <span key={`${pKey}-k`} className="text-sky-400 font-semibold">
            {keyPart}
          </span>
        );
        parts.push(
          <span key={`${pKey}-col`} className="text-slate-500 font-bold">
            {colonPart}
          </span>
        );
      } else if (token.startsWith('"')) {
        // String Value
        parts.push(
          <span key={pKey} className="text-orange-300 font-medium">
            {token}
          </span>
        );
      } else if (token === 'true' || token === 'false') {
        // Boolean
        parts.push(
          <span key={pKey} className="text-purple-400 font-bold">
            {token}
          </span>
        );
      } else if (token === 'null') {
        // Null
        parts.push(
          <span key={pKey} className="text-rose-400 font-bold">
            {token}
          </span>
        );
      } else if (/^-?\d/.test(token)) {
        // Number
        parts.push(
          <span key={pKey} className="text-emerald-400 font-mono">
            {token}
          </span>
        );
      } else if (token === '{' || token === '}' || token === '[' || token === ']') {
        // Brackets & Braces
        parts.push(
          <span key={pKey} className="text-slate-100 font-bold">
            {token}
          </span>
        );
      } else if (token === ',') {
        // Comma
        parts.push(
          <span key={pKey} className="text-slate-500 font-bold">
            {token}
          </span>
        );
      } else {
        parts.push(
          <span key={pKey} className="text-slate-300">
            {token}
          </span>
        );
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
    <div className="flex flex-col h-full bg-[#0d1117] text-xs font-mono select-text overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] select-none text-[11px] flex-wrap gap-2 shrink-0">
        {/* Left Side: View Mode Tabs & Validation Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive folding tree view"
            >
              <FoldHorizontal className="w-3 h-3" />
              <span>Tree View</span>
            </button>
          </div>

          {/* Validation Status Badge */}
          {value.trim() && (
            <div className="flex items-center gap-1 font-sans">
              {validation.isValid ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Valid JSON</span>
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                  title={validation.message}
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{validation.message}</span>
                </span>
              )}
            </div>
          )}

          {actionNotice && (
            <span className="text-[10px] text-amber-300 font-sans animate-fade-in">
              {actionNotice}
            </span>
          )}
        </div>

        {/* Right Side: Formatting Actions */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            type="button"
            onClick={handlePrettify}
            className="flex items-center gap-1 hover:text-sky-300 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
            title="Prettify JSON with 2-space indentation"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Prettify</span>
          </button>

          <button
            type="button"
            onClick={handleMinify}
            className="flex items-center gap-1 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
            title="Minify JSON into one single line"
          >
            <Minimize2 className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Minify</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWrapEnabled(!isWrapEnabled)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              isWrapEnabled ? 'text-sky-400 bg-sky-500/10' : 'hover:text-slate-200 hover:bg-[#21262d]'
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3 h-3" />
            <span className="hidden sm:inline">Wrap</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
            title="Copy JSON body"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-slate-500 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
              title="Clear body content"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <span className="text-slate-600">|</span>

          <span className="text-[10px] text-slate-500 font-mono">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden flex">
        {viewMode === 'edit' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Gutter with Line Numbers */}
            <div
              ref={gutterRef}
              className="w-12 shrink-0 py-2.5 pr-2 select-none text-right font-mono text-xs leading-5 text-slate-600 border-r border-[#30363d]/50 bg-[#161b22]/30 overflow-hidden"
            >
              {lines.map((_, i) => (
                <div key={i} className="h-5">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Input Area with Real-Time Syntax Highlight Overlay */}
            <div className="relative flex-1 h-full overflow-hidden">
              {/* Underlying Syntax-Highlighted Layer */}
              <div
                ref={preRef}
                aria-hidden="true"
                className={`absolute inset-0 p-2.5 font-mono text-xs leading-5 pointer-events-none select-none overflow-hidden ${
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

              {/* Textarea for Keystroke Input & Caret */}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className={`relative z-10 w-full h-full p-2.5 font-mono text-xs leading-5 bg-transparent resize-none outline-none overflow-auto selection:bg-sky-500/30 selection:text-transparent ${
                  value ? 'text-transparent caret-sky-400' : 'text-slate-200 placeholder:text-slate-600'
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
    </div>
  );
};
