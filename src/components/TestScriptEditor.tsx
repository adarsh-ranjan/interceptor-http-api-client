import React from 'react';
import { TEST_SNIPPETS } from '../utils/testRunner';
import { CheckSquare, Sparkles, Trash2, Info } from 'lucide-react';

interface TestScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
}

export const TestScriptEditor: React.FC<TestScriptEditorProps> = ({
  script,
  onChange,
}) => {
  const handleInsertSnippet = (snippetCode: string) => {
    const updated = script ? `${script.trim()}\n\n${snippetCode}` : snippetCode;
    onChange(updated);
  };

  const handleClear = () => {
    onChange('');
  };

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
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-[#21262d] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden gap-3">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col rounded border border-[#30363d] bg-[#0d1117] overflow-hidden">
          <textarea
            value={script}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`// Write JavaScript assertions that execute automatically after response\ninterceptor.test("Status code is 200", () => {\n  interceptor.expect(res.status).toBe(200);\n});`}
            spellCheck={false}
            className="w-full flex-1 p-3 font-mono text-xs bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed"
          />

          <div className="px-3 py-1.5 bg-[#161b22] border-t border-[#30363d]/50 text-[10px] text-slate-500 flex items-center gap-2">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Available globals: <code className="text-sky-400">interceptor</code> (<code className="text-slate-300">test</code>, <code className="text-slate-300">expect</code>, <code className="text-slate-300">setEnvironmentVariable</code>) and <code className="text-sky-400">res</code>.</span>
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
                className="w-full text-left p-1.5 rounded bg-[#0d1117] hover:bg-[#21262d] text-slate-300 hover:text-white border border-[#30363d]/40 transition-colors text-[11px]"
              >
                + {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
