import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Copy,
  Check,
  FoldHorizontal,
  UnfoldHorizontal,
  WrapText,
  ExternalLink,
} from 'lucide-react';

interface JsonSyntaxViewerProps {
  data: any;
  rawText?: string;
  onCopy?: () => void;
}

interface FoldRange {
  start: number;
  end: number;
  itemCount?: number;
  isObject: boolean;
}

export const JsonSyntaxViewer: React.FC<JsonSyntaxViewerProps> = ({
  data,
  rawText,
  onCopy,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isWrapEnabled, setIsWrapEnabled] = useState(false);
  const [foldedStarts, setFoldedStarts] = useState<Set<number>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Format JSON with 2 spaces
  const jsonString = useMemo(() => {
    if (typeof data !== 'undefined') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        // Fallback to raw text
      }
    }
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return rawText;
      }
    }
    return '';
  }, [data, rawText]);

  const rawLines = useMemo(() => jsonString.split('\n'), [jsonString]);

  // Compute fold ranges for every opening { or [
  const foldRanges = useMemo(() => {
    const ranges = new Map<number, FoldRange>();
    const stack: { index: number; char: '{' | '[' }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      const opensObj = line.endsWith('{') || line.endsWith('{,');
      const opensArr = line.endsWith('[') || line.endsWith('[,') || line === '[';

      if (opensObj) {
        stack.push({ index: i, char: '{' });
      } else if (opensArr) {
        stack.push({ index: i, char: '[' });
      }

      // Closing check: only pop if this line is an actual block close (and not a single-line `{}` or `[]`)
      const closesObj = (line.startsWith('}') || line.startsWith('},') || line.endsWith('}') || line.endsWith('},')) && !opensObj;
      const closesArr = (line.startsWith(']') || line.startsWith('],') || line.endsWith(']') || line.endsWith('],')) && !opensArr;

      if (closesObj) {
        const top = stack.pop();
        if (top && top.char === '{' && i > top.index) {
          ranges.set(top.index, {
            start: top.index,
            end: i,
            itemCount: Math.max(0, i - top.index - 1),
            isObject: true,
          });
        }
      } else if (closesArr) {
        const top = stack.pop();
        if (top && top.char === '[' && i > top.index) {
          ranges.set(top.index, {
            start: top.index,
            end: i,
            itemCount: Math.max(0, i - top.index - 1),
            isObject: false,
          });
        }
      }
    }
    return ranges;
  }, [rawLines]);

  // Toggle fold for a specific line index
  const toggleFold = (lineIndex: number) => {
    setFoldedStarts((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  };

  const collapseAll = () => {
    const allStarts = new Set(foldRanges.keys());
    setFoldedStarts(allStarts);
  };

  const expandAll = () => {
    setFoldedStarts(new Set());
  };

  // Search match statistics
  const matchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const term = searchTerm.toLowerCase();
    let count = 0;
    for (const line of rawLines) {
      let idx = 0;
      const lower = line.toLowerCase();
      while ((idx = lower.indexOf(term, idx)) !== -1) {
        count++;
        idx += term.length;
      }
    }
    return count;
  }, [rawLines, searchTerm]);

  // Handle URL copy
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  // Render tokens within a single JSON line
  const renderHighlightedTokens = (line: string) => {
    // Regex matching:
    // 1. Strings with optional colon (keys vs string values)
    // 2. Booleans & null
    // 3. Numbers
    // 4. Punctuation
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const renderWithHighlight = (text: string, colorClass: string, keyPrefix: string, isUrl = false, urlRaw = '') => {
      if (!searchTerm.trim()) {
        if (isUrl) {
          return (
            <span
              key={keyPrefix}
              className={`${colorClass} hover:underline cursor-pointer inline-flex items-center gap-1 group/url`}
              onClick={() => handleCopyUrl(urlRaw)}
              title="Click to copy URL"
            >
              <span>{text}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/url:opacity-100 transition-opacity" />
            </span>
          );
        }
        return <span key={keyPrefix} className={colorClass}>{text}</span>;
      }

      const term = searchTerm.toLowerCase();
      const lower = text.toLowerCase();
      const subParts: React.ReactNode[] = [];
      let subIdx = 0;
      let mIdx = 0;

      while ((mIdx = lower.indexOf(term, subIdx)) !== -1) {
        if (mIdx > subIdx) {
          subParts.push(text.substring(subIdx, mIdx));
        }
        subParts.push(
          <mark
            key={`${keyPrefix}-m-${mIdx}`}
            className="bg-amber-400/30 text-amber-200 rounded-xs px-0.5 ring-1 ring-amber-400/50"
          >
            {text.substring(mIdx, mIdx + term.length)}
          </mark>
        );
        subIdx = mIdx + term.length;
      }
      if (subIdx < text.length) {
        subParts.push(text.substring(subIdx));
      }

      return (
        <span key={keyPrefix} className={colorClass}>
          {subParts}
        </span>
      );
    };

    let tokenIdx = 0;
    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index === tokenRegex.lastIndex) {
        tokenRegex.lastIndex++;
      }

      if (match.index > lastIndex) {
        const gap = line.substring(lastIndex, match.index);
        parts.push(<span key={`gap-${tokenIdx}`} className="text-slate-400">{gap}</span>);
      }

      const token = match[0];
      const pKey = `tok-${tokenIdx++}`;

      if (token.endsWith(':')) {
        // Property Key (e.g. "title":)
        const colonIdx = token.lastIndexOf(':');
        const keyPart = token.substring(0, colonIdx);
        const colonPart = token.substring(colonIdx);

        parts.push(renderWithHighlight(keyPart, 'text-sky-400 font-semibold', `${pKey}-k`));
        parts.push(<span key={`${pKey}-col`} className="text-slate-400">{colonPart}</span>);
      } else if (token.startsWith('"')) {
        // String Value
        const unquoted = token.slice(1, -1);
        const isUrl = /^https?:\/\//i.test(unquoted);

        parts.push(
          renderWithHighlight(
            token,
            'text-orange-300 font-medium',
            `${pKey}-str`,
            isUrl,
            unquoted
          )
        );
      } else if (token === 'true' || token === 'false') {
        // Boolean
        parts.push(renderWithHighlight(token, 'text-purple-400 font-bold', `${pKey}-bool`));
      } else if (token === 'null') {
        // Null
        parts.push(renderWithHighlight(token, 'text-rose-400 font-bold', `${pKey}-null`));
      } else if (/^-?\d/.test(token)) {
        // Number
        parts.push(renderWithHighlight(token, 'text-emerald-400 font-mono', `${pKey}-num`));
      } else if (token === '{' || token === '}' || token === '[' || token === ']') {
        // Brackets & Braces
        parts.push(<span key={pKey} className="text-slate-100 font-bold">{token}</span>);
      } else if (token === ',') {
        // Comma
        parts.push(<span key={pKey} className="text-slate-500 font-bold">{token}</span>);
      } else {
        parts.push(<span key={pKey} className="text-slate-300">{token}</span>);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(<span key="end" className="text-slate-400">{line.substring(lastIndex)}</span>);
    }

    return parts;
  };

  const MAX_LINES_RENDERED = 2000;
  const isTruncated = rawLines.length > MAX_LINES_RENDERED;

  // Build the list of visible lines, taking folding into account
  const visibleLines = useMemo(() => {
    const list: {
      originalIndex: number;
      text: string;
      isFoldStart: boolean;
      isFolded: boolean;
      foldRange?: FoldRange;
    }[] = [];

    let skipUntil = -1;
    const maxI = Math.min(rawLines.length, MAX_LINES_RENDERED);

    for (let i = 0; i < maxI; i++) {
      if (i <= skipUntil) {
        continue;
      }

      const foldRange = foldRanges.get(i);
      const isFolded = foldedStarts.has(i);

      list.push({
        originalIndex: i,
        text: rawLines[i],
        isFoldStart: !!foldRange,
        isFolded,
        foldRange,
      });

      if (isFolded && foldRange) {
        skipUntil = foldRange.end;
      }
    }

    return list;
  }, [rawLines, foldRanges, foldedStarts]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-xs font-mono select-text">
      {/* Response JSON Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] select-none text-[11px] flex-wrap gap-2 shrink-0">
        {/* Left Side: Search in JSON */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search in JSON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded pl-6 pr-6 py-0.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-44 font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchTerm && (
            <span className="text-[10px] text-slate-400 font-mono">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>

        {/* Right Side: Fold / Unfold & Formatting Tools */}
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
            title="Collapse all objects and arrays"
          >
            <FoldHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Collapse</span>
          </button>

          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-[#21262d] transition-colors"
            title="Expand all"
          >
            <UnfoldHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Expand</span>
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

          <span className="text-slate-600">|</span>

          <span className="text-[10px] text-slate-500">
            {rawLines.length} lines
          </span>

          {copiedUrl && (
            <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
              <Check className="w-3 h-3" />
              Copied URL
            </span>
          )}
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="flex-1 overflow-auto p-2">
        <div className="min-w-full inline-block">
          {visibleLines.map(({ originalIndex, text, isFoldStart, isFolded, foldRange }) => {
            const lineNumber = originalIndex + 1;

            return (
              <div
                key={originalIndex}
                className="flex items-start hover:bg-[#161b22]/70 group transition-colors rounded-xs leading-5"
              >
                {/* Gutter with line numbers & fold chevron */}
                <div className="flex items-center justify-end w-14 shrink-0 pr-2 select-none text-slate-600 group-hover:text-slate-400 border-r border-[#30363d]/40 mr-3">
                  {isFoldStart ? (
                    <button
                      type="button"
                      onClick={() => toggleFold(originalIndex)}
                      className="p-0.5 text-slate-500 hover:text-sky-400 rounded hover:bg-[#21262d] transition-colors mr-1 cursor-pointer"
                      title={isFolded ? 'Expand' : 'Collapse'}
                    >
                      {isFolded ? (
                        <ChevronRight className="w-3 h-3 text-sky-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-3.5 mr-1" />
                  )}
                  <span className="font-mono text-[11px] text-slate-500 group-hover:text-slate-400">
                    {lineNumber}
                  </span>
                </div>

                {/* Line Code Content */}
                <div
                  className={`flex-1 font-mono text-xs ${
                    isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
                >
                  {isFolded && foldRange ? (
                    <span className="inline-flex items-center gap-1.5">
                      {renderHighlightedTokens(text)}
                      <button
                        type="button"
                        onClick={() => toggleFold(originalIndex)}
                        className="px-1.5 py-0.2 rounded bg-[#21262d] text-slate-400 hover:text-sky-300 text-[10px] font-mono border border-[#30363d] inline-flex items-center gap-1 cursor-pointer"
                        title="Click to expand"
                      >
                        <span>{foldRange.isObject ? '{ ... }' : '[ ... ]'}</span>
                        <span className="text-slate-500">
                          {foldRange.itemCount} {foldRange.itemCount === 1 ? 'line' : 'lines'}
                        </span>
                      </button>
                      {foldRange.end < rawLines.length &&
                        rawLines[foldRange.end]?.trim()?.endsWith(',') && (
                          <span className="text-slate-500 font-bold">,</span>
                      )}
                    </span>
                  ) : (
                    renderHighlightedTokens(text)
                  )}
                </div>
              </div>
            );
          })}

          {isTruncated && (
            <div className="mt-4 p-3 bg-[#161b22] border border-[#30363d] rounded text-slate-400 text-xs font-sans flex items-center justify-between">
              <span>
                Showing first {MAX_LINES_RENDERED.toLocaleString()} lines of {rawLines.length.toLocaleString()} lines.
                Switch to the <strong>Raw</strong> tab to view complete unformatted response.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
