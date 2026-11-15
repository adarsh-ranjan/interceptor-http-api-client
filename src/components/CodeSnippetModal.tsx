import React, { useState } from 'react';
import { HttpRequest } from '../types';
import { CODE_LANGUAGES, generateSnippet, SupportedLanguage } from '../utils/codegen';
import { Code2, Copy, Check, X } from 'lucide-react';

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HttpRequest;
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const snippet = generateSnippet(request, selectedLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl h-[520px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Generate Code Snippets</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center px-3 border-b border-[#30363d] bg-[#161b22] overflow-x-auto no-scrollbar gap-1">
          {CODE_LANGUAGES.map((lang) => {
            const isSelected = lang.id === selectedLang;
            return (
              <button
                key={lang.id}
                onClick={() => setSelectedLang(lang.id)}
                className={`px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang.name}
              </button>
            );
          })}
        </div>

        {/* Code Content Container */}
        <div className="flex-1 relative bg-[#0d1117] p-3 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d]/40">
            <span className="text-[11px] text-slate-500 font-mono">
              Ready to copy and paste into your application or terminal
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 hover:text-white transition-colors border border-[#30363d]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto rounded bg-[#090d13] border border-[#30363d]/60 p-3">
            <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre select-text selection:bg-sky-500/30">
              {snippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
