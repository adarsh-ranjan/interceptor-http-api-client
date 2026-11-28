import React, { useRef, useState } from 'react';
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Check, Code2, Copy, Wand2 } from 'lucide-react';
import { useClipboard } from '../hooks/useClipboard';
import { setupMonacoGlobalEnvironment } from '../utils/monacoMockSetup';

interface DynamicScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export const DynamicScriptEditor: React.FC<DynamicScriptEditorProps> = ({
  value,
  onChange,
  height = '100%',
  minHeight = '280px',
  readOnly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const { copied, copy } = useClipboard(2000);

  const handleBeforeMount: BeforeMount = (m) => {
    setupMonacoGlobalEnvironment(m);
  };

  const handleEditorDidMount: OnMount = (editor, m) => {
    editorRef.current = editor;
    setupMonacoGlobalEnvironment(m);
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
    m.editor.setTheme('interceptor-vscode-dark');
  };

  const handleFormatCode = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
  };

  return (
    <div className="flex-1 flex flex-col border border-[#333333] rounded overflow-hidden bg-[#141517]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b1e] border-b border-[#282a2d] text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#d99b26] font-medium">
            <Code2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-semibold tracking-wide">
              JavaScript Route Handler
            </span>
          </div>
          <span className="text-[10px] text-[#666666] hidden sm:inline">
            • VSCode Monaco Engine (ES2022)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleFormatCode}
            title="Prettify & Format Script (Shift+Alt+F)"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#aaaaaa] hover:text-white hover:bg-[#25282c] border border-transparent hover:border-[#3a3d42] transition-colors cursor-pointer"
          >
            <Wand2 className="w-3 h-3 text-[#d99b26]" />
            <span>Format</span>
          </button>

          <button
            type="button"
            onClick={() => copy(value)}
            title="Copy script to clipboard"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#aaaaaa] hover:text-white hover:bg-[#25282c] border border-transparent hover:border-[#3a3d42] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#888888]" />
                <span>Copy</span>
              </>
            )}
          </button>

          <div className="text-[10px] text-[#777777] font-mono pl-1 border-l border-[#333333]">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full" style={{ minHeight, height }}>
        <Editor
          height="100%"
          language="javascript"
          value={value}
          onChange={(val) => onChange(val || '')}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          theme="interceptor-vscode-dark"
          options={{
            readOnly,
            fontSize: 12.5,
            lineHeight: 20,
            fontFamily:
              '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, "Courier New", monospace',
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
            folding: true,
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: true },
            parameterHints: { enabled: true },
            suggest: {
              showWords: true,
              snippetsPreventQuickSuggestions: false,
            },
          }}
        />
      </div>
    </div>
  );
};
