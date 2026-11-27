import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TEST_SNIPPETS } from '../utils/testRunner';
import { Environment } from '../types';
import { Sparkles, Trash2, Info, Braces } from 'lucide-react';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import {
  findVariableInMultilineText,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';

interface TestScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
  mode?: 'script' | 'tests';
}

export const TestScriptEditor: React.FC<TestScriptEditorProps> = ({
  script,
  onChange,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
  mode = 'script',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showSnippets, setShowSnippets] = useState(true);
  const [hoveredVar, setHoveredVar] = useState<{
    info: VariableResolutionInfo;
    x: number;
    y: number;
  } | null>(null);

  const lines = useMemo(() => (script ? script.split('\n') : ['']), [script]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current || !script) return;
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const paddingLeft = parseFloat(style.paddingLeft) || 12;
    const paddingTop = parseFloat(style.paddingTop) || 12;
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const charWidth = 7.2;

    const mouseX = e.clientX - rect.left - paddingLeft + textarea.scrollLeft;
    const mouseY = e.clientY - rect.top - paddingTop + textarea.scrollTop;

    if (mouseX < 0 || mouseY < 0) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setHoveredVar(null), 100);
      return;
    }

    const lineIndex = Math.floor(mouseY / lineHeight);
    const charInLine = Math.floor(mouseX / charWidth);

    const matched = findVariableInMultilineText(script, lineIndex, charInLine);
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

  const handleChipHover = (e: React.MouseEvent<HTMLButtonElement>, varName: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const info = resolveVariableInfo(varName, activeEnvironment, environments);
    setHoveredVar({
      info,
      x: rect.left + rect.width / 2,
      y: rect.top - 120 > 0 ? rect.top - 140 : rect.bottom + 6,
    });
  };

  const handleInsertSnippet = (snippetCode: string) => {
    const updated = script ? `${script.trim()}\n\n${snippetCode}` : snippetCode;
    onChange(updated);
  };

  const handleInsertEnvGetter = (varKey: string) => {
    const code = `const ${varKey.replace(/[^a-zA-Z0-9_$]/g, '_')} = interceptor.getEnvironmentVariable("${varKey}");\n`;
    const updated = script ? `${script.trim()}\n${code}` : code;
    onChange(updated);
  };

  const activeVars = activeEnvironment?.variables.filter((v) => v.enabled && v.key.trim()) || [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-xs bg-[#1a1a1a]">
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area with Line Gutter */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Gutter (NO vertical line, matches Bruno) */}
            <div className="w-10 shrink-0 pt-4 pb-4 pl-3 pr-1 select-none text-left font-mono text-xs leading-5 text-[#666666] bg-[#1a1a1a] overflow-hidden">
              {lines.map((_, i) => (
                <div key={i} className="h-5">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Script Textarea */}
            <div className="flex-1 relative h-full overflow-hidden">
              <textarea
                ref={textareaRef}
                value={script}
                onChange={(e) => {
                  setHoveredVar(null);
                  onChange(e.target.value);
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                placeholder={`// Write assertions or scripts\ninterceptor.test("Status is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});`}
                spellCheck={false}
                className="w-full h-full pt-4 pb-4 pl-2 pr-4 font-mono text-xs leading-5 bg-transparent text-[#cccccc] resize-none outline-none selection:bg-[#d99b26]/30 caret-[#d99b26] overflow-auto"
              />
            </div>
          </div>

          {/* Bottom Bar: Environment Variables & Globals Info */}
          <div className="border-t border-[#333333] bg-[#1a1a1a]">
            {activeVars.length > 0 && (
              <div className="px-3 py-1 border-b border-[#333333]/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-[#888888] shrink-0 flex items-center gap-1 font-mono">
                  <Braces className="w-3 h-3 text-[#d99b26]" />
                  <span>Env ({activeEnvironment?.name}):</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeVars.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleInsertEnvGetter(v.key)}
                      onMouseEnter={(e) => handleChipHover(e, v.key)}
                      onMouseLeave={handleMouseLeave}
                      className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[#d99b26] bg-[#d99b26]/10 border border-[#d99b26]/30 hover:bg-[#d99b26]/20 transition-colors cursor-pointer"
                      title={`Insert getEnvironmentVariable("${v.key}")`}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-3 py-1 text-[10px] text-[#777777] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3 text-[#666666] shrink-0" />
                <span>Globals: <code className="text-[#d99b26]">interceptor</code> (<code className="text-[#cccccc]">test</code>, <code className="text-[#cccccc]">expect</code>, <code className="text-[#cccccc]">getEnvironmentVariable</code>), <code className="text-[#d99b26]">res</code></span>
              </div>
              <button
                type="button"
                onClick={() => setShowSnippets(!showSnippets)}
                className="text-[10px] text-[#888888] hover:text-[#d99b26] transition-colors cursor-pointer"
              >
                {showSnippets ? 'Hide Snippets' : 'Show Snippets'}
              </button>
            </div>
          </div>
        </div>

        {/* Snippets Sidebar (Optional Collapsible Panel) */}
        {showSnippets && (
          <div className="w-48 bg-[#222224] border-l border-[#333333] p-2.5 flex flex-col shrink-0 select-none">
            <div className="flex items-center justify-between text-[#cccccc] font-semibold mb-2 text-xs">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#d99b26]" />
                <span>Snippets</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">
              {TEST_SNIPPETS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleInsertSnippet(item.code)}
                  className="w-full text-left p-1.5 rounded bg-[#1a1a1a] hover:bg-[#26292b] text-[#cccccc] hover:text-white border border-[#333333] transition-colors text-[11px] cursor-pointer"
                >
                  + {item.name}
                </button>
              ))}
            </div>
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
