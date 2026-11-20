import React, { useRef, useState, useEffect } from 'react';
import { TEST_SNIPPETS } from '../utils/testRunner';
import { Environment } from '../types';
import { CheckSquare, Sparkles, Trash2, Info, Braces } from 'lucide-react';
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
}

export const TestScriptEditor: React.FC<TestScriptEditorProps> = ({
  script,
  onChange,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current || !script) return;
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const paddingLeft = parseFloat(style.paddingLeft) || 12;
    const paddingTop = parseFloat(style.paddingTop) || 12;
    const lineHeight = parseFloat(style.lineHeight) || 18;
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

  const handleClear = () => {
    onChange('');
  };

  const activeVars = activeEnvironment?.variables.filter((v) => v.enabled && v.key.trim()) || [];

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d]/50">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
          <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
          <span>Post-Response Test Scripts</span>
        </div>

        {script && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden gap-3">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col rounded border border-[#30363d] bg-[#0d1117] overflow-hidden relative">
          <textarea
            ref={textareaRef}
            value={script}
            onChange={(e) => {
              setHoveredVar(null);
              onChange(e.target.value);
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            placeholder={`// Write JavaScript assertions that execute automatically after response\n// Environment variables can be accessed via interceptor.getEnvironmentVariable("key") or pm.environment.get("key")\ninterceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});`}
            spellCheck={false}
            className="w-full flex-1 p-3 font-mono text-xs bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed"
          />

          {/* Environment Variables Reference Bar */}
          {activeVars.length > 0 && (
            <div className="px-3 py-1.5 bg-[#161b22] border-t border-[#30363d]/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                <Braces className="w-3 h-3 text-amber-400" />
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
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    title={`Click to insert getEnvironmentVariable("${v.key}") • Hover to preview value`}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-3 py-1.5 bg-[#0d1117] border-t border-[#30363d]/40 text-[10px] text-slate-500 flex items-center gap-2">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Available globals: <code className="text-sky-400">interceptor</code> (<code className="text-slate-300">test</code>, <code className="text-slate-300">expect</code>, <code className="text-slate-300">getEnvironmentVariable</code>, <code className="text-slate-300">setEnvironmentVariable</code>), <code className="text-sky-400">pm.environment</code>, and <code className="text-sky-400">res</code>.</span>
          </div>
        </div>

        {/* Snippets Panel */}
        <div className="w-48 bg-[#161b22] border border-[#30363d] rounded p-2.5 flex flex-col shrink-0">
          <div className="flex items-center gap-1 text-slate-300 font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Snippets</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {TEST_SNIPPETS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleInsertSnippet(item.code)}
                className="w-full text-left p-1.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-slate-300 hover:text-white border border-[#30363d]/40 transition-colors text-[11px] cursor-pointer"
              >
                + {item.name}
              </button>
            ))}
          </div>
        </div>
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
