import React, { useState } from 'react';
import { HttpRequest } from '../types';
import { CODE_LANGUAGES, generateSnippet, SupportedLanguage } from '../utils/codegen';
import { useClipboard } from '../hooks/useClipboard';
import { Check, Code2, Copy } from 'lucide-react';
import { ModalShell } from './ModalShell';

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
  const { copied, copy } = useClipboard(2000);

  if (!isOpen) return null;

  const snippet = generateSnippet(request, selectedLang);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Code Snippets"
      icon={<Code2 className="w-4 h-4 text-[#d99b26]" />}
      containerClassName="w-full max-w-2xl h-[520px]"
    >
      <div className="flex items-center px-3 border-b border-[#333333] bg-[#222224] overflow-x-auto no-scrollbar gap-1">
        {CODE_LANGUAGES.map((lang) => {
          const isSelected = lang.id === selectedLang;
          return (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                  : 'border-transparent text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              {lang.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 relative bg-[#1a1a1a] p-3 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333]">
          <span className="text-[11px] text-[#888888] font-mono">
            Ready to copy and paste into your application or terminal
          </span>
          <button
            onClick={() => copy(snippet)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#26292b] hover:bg-[#2e3235] text-[#cccccc] hover:text-white transition-colors border border-[#333333] cursor-pointer"
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

        <div className="flex-1 overflow-auto rounded bg-[#1a1a1a] border border-[#333333] p-3">
          <pre className="font-mono text-xs leading-relaxed text-[#cccccc] whitespace-pre select-text selection:bg-[#d99b26]/30">
            {snippet}
          </pre>
        </div>
      </div>
    </ModalShell>
  );
};
