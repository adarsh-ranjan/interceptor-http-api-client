import React, { useState } from 'react';
import { HttpRequest } from '../types';
import { CODE_LANGUAGES, generateSnippet, SupportedLanguage } from '../utils/codegen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Code2, Copy, Check } from 'lucide-react';

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

  const snippet = generateSnippet(request, selectedLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[520px] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-[#141517]">
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span>Generate Code Snippets</span>
          </DialogTitle>
          <DialogDescription>
            Export the current request into production-ready client code.
          </DialogDescription>
        </DialogHeader>

        {/* Language Tabs */}
        <div className="flex items-center px-4 border-b border-border bg-[#1a1b1e] overflow-x-auto gap-1">
          {CODE_LANGUAGES.map((lang) => {
            const isSelected = lang.id === selectedLang;
            return (
              <button
                key={lang.id}
                onClick={() => setSelectedLang(lang.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'border-primary text-foreground font-semibold -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang.name}
              </button>
            );
          })}
        </div>

        {/* Code Content Container */}
        <div className="flex-1 relative bg-[#141517] p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
            <span className="text-[11px] text-muted-foreground font-mono">
              Ready to copy and paste into your application or terminal
            </span>
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs">
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>Copy Snippet</span>
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="flex-1 rounded-md border border-border bg-[#1a1b1e] p-3">
            <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre select-text selection:bg-primary/30">
              {snippet}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
