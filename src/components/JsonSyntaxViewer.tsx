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

        parts.push(renderWithHighlight(keyPart, 'text-[#61afef] font-normal', `${pKey}-k`));
        parts.push(<span key={`${pKey}-col`} className="text-[#888888]">{colonPart}</span>);
      } else if (token.startsWith('"')) {
        // String Value
        const unquoted = token.slice(1, -1);
        const isUrl = /^https?:\/\//i.test(unquoted);

        parts.push(
          renderWithHighlight(
            token,
            'text-[#e5c07b] font-normal',
            `${pKey}-str`,
            isUrl,
            unquoted
          )
        );
      } else if (token === 'true' || token === 'false') {
        // Boolean
        parts.push(renderWithHighlight(token, 'text-[#ef596f] font-normal', `${pKey}-bool`));
      } else if (token === 'null') {
        // Null
        parts.push(renderWithHighlight(token, 'text-[#ef596f] font-normal', `${pKey}-null`));
      } else if (/^-?\d/.test(token)) {
        // Number
        parts.push(renderWithHighlight(token, 'text-[#d19a66] font-mono font-normal', `${pKey}-num`));
      } else if (token === '{' || token === '}' || token === '[' || token === ']') {
        // Brackets & Braces
        parts.push(<span key={pKey} className="text-[#abb2bf] font-normal">{token}</span>);
      } else if (token === ',') {
        // Comma
        parts.push(<span key={pKey} className="text-[#888888] font-normal">{token}</span>);
      } else {
        parts.push(<span key={pKey} className="text-[#abb2bf]">{token}</span>);
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
    <div className="flex flex-col h-full bg-[#1a1a1a] text-xs font-mono select-text">
      {/* Response JSON Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#222224] border-b border-[#333333] select-none text-[11px] flex-wrap gap-2 shrink-0">
        {/* Left Side: Search in JSON */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2 text-[#777777] pointer-events-none" />
            <input
              type="text"
              placeholder="Search in JSON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333333] rounded pl-6 pr-6 py-0.5 text-xs text-[#cccccc] placeholder:text-[#666666] focus:outline-none focus:border-[#444444] w-44 font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 text-[#777777] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchTerm && (
            <span className="text-[10px] text-[#888888] font-mono">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>

        {/* Right Side: Fold / Unfold & Formatting Tools */}
        <div className="flex items-center gap-2 text-[#888888]">
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1 hover:text-[#cccccc] px-1.5 py-0.5 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
            title="Collapse all objects and arrays"
          >
            <FoldHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Collapse</span>
          </button>

          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1 hover:text-[#cccccc] px-1.5 py-0.5 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
            title="Expand all"
          >
            <UnfoldHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Expand</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWrapEnabled(!isWrapEnabled)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              isWrapEnabled ? 'text-[#d99b26] bg-[#d99b26]/10' : 'hover:text-[#cccccc] hover:bg-[#26292b]'
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3 h-3" />
            <span className="hidden sm:inline">Wrap</span>
          </button>

          <span className="text-[#444444]">|</span>

          <span className="text-[10px] text-[#666666]">
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
      <div className="flex-1 overflow-auto pt-4 pb-4 px-3">
        <div className="min-w-full inline-block">
          {visibleLines.map(({ originalIndex, text, isFoldStart, isFolded, foldRange }) => {
            const lineNumber = originalIndex + 1;

            return (
              <div
                key={originalIndex}
                className="flex items-start hover:bg-[#222224]/70 group transition-colors rounded-xs leading-5"
              >
                {/* Gutter with line numbers & fold caret (NO vertical line, matches Image 2) */}
                <div className="flex items-center justify-between w-12 shrink-0 pl-1 pr-2 select-none text-[#666666]">
                  <span className="font-mono text-xs text-[#666666]">
                    {lineNumber}
                  </span>
                  {isFoldStart ? (
                    <button
                      type="button"
                      onClick={() => toggleFold(originalIndex)}
                      className="w-4 h-4 flex items-center justify-center text-[#666666] hover:text-[#d99b26] transition-colors cursor-pointer text-[10px] select-none"
                      title={isFolded ? 'Expand' : 'Collapse'}
                    >
                      {isFolded ? '▸' : '▾'}
                    </button>
                  ) : (
                    <span className="w-4 text-center text-transparent text-[10px]">&nbsp;</span>
                  )}
                </div>

                {/* Line Code Content */}
                <div
                  className={`flex-1 font-mono text-xs pl-2 ${
                    isWrapEnabled ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
                >
                  {isFolded && foldRange ? (
                    <span className="inline-flex items-center gap-1.5">
                      {renderHighlightedTokens(text)}
                      <button
                        type="button"
                        onClick={() => toggleFold(originalIndex)}
                        className="px-1.5 py-0.2 rounded bg-[#26292b] text-[#999999] hover:text-[#d99b26] text-[10px] font-mono border border-[#333333] inline-flex items-center gap-1 cursor-pointer"
                        title="Click to expand"
                      >
                        <span>{foldRange.isObject ? '{ ... }' : '[ ... ]'}</span>
                        <span className="text-[#666666]">
                          {foldRange.itemCount} {foldRange.itemCount === 1 ? 'line' : 'lines'}
                        </span>
                      </button>
                      {foldRange.end < rawLines.length &&
                        rawLines[foldRange.end]?.trim()?.endsWith(',') && (
                          <span className="text-[#777777] font-bold">,</span>
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
            <div className="mt-4 p-3 bg-[#222224] border border-[#333333] rounded text-[#888888] text-xs font-sans flex items-center justify-between">
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
