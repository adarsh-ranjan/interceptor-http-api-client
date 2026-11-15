import React from 'react';
import { HttpMethod } from '../types';
import { getMethodColor } from '../utils/http';
import { Send, XCircle, ChevronDown, Bookmark, Code2 } from 'lucide-react';

interface RequestBarProps {
  method: HttpMethod;
  onMethodChange: (method: HttpMethod) => void;
  url: string;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onSave: () => void;
  onOpenCodeSnippet: () => void;
  isLoading: boolean;
  isDirty?: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const RequestBar: React.FC<RequestBarProps> = ({
  method,
  onMethodChange,
  url,
  onUrlChange,
  onSend,
  onCancel,
  onSave,
  onOpenCodeSnippet,
  isLoading,
  isDirty,
}) => {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const sendShortcut = isMac ? '⌘↵' : 'Ctrl+↵';
  const saveShortcut = isMac ? '⌘S' : 'Ctrl+S';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !isLoading)) {
      e.preventDefault();
      onSend();
    }
  };

  const methodColor = getMethodColor(method);

  return (
    <div className="flex items-center gap-2 p-2 bg-[#161b22] border-b border-[#30363d] w-full">
      {/* Method Dropdown */}
      <div className="relative group">
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          disabled={isLoading}
          className={`appearance-none font-mono font-bold text-xs uppercase pl-3 pr-7 py-2 rounded-l-md border border-[#30363d] bg-[#0d1117] cursor-pointer focus:outline-none focus:border-sky-500 transition-colors ${methodColor.text}`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} className="bg-[#161b22] text-slate-200 font-sans">
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
      </div>

      {/* URL Input Bar */}
      <div className="flex-1 relative flex items-center">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter request URL (e.g. {{baseUrl}}/posts)"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-r-md px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
        />
      </div>

      {/* Code Snippet Button */}
      <button
        type="button"
        onClick={onOpenCodeSnippet}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-[#30363d] bg-[#0d1117] text-slate-300 hover:bg-[#21262d] hover:text-white transition-all"
        title="Generate code snippet (cURL, Python, JS, Go)"
      >
        <Code2 className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden sm:inline">Code</span>
      </button>

      {/* Save Button */}
      <button
        type="button"
        onClick={onSave}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-all ${
          isDirty
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
            : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:bg-[#21262d] hover:text-white'
        }`}
        title={`Save request (${saveShortcut})`}
      >
        <Bookmark className={`w-3.5 h-3.5 ${isDirty ? 'text-amber-400 fill-amber-400/30' : 'text-slate-400'}`} />
        <span>Save</span>
        <span className="text-[10px] opacity-60 font-mono ml-0.5">{saveShortcut}</span>
      </button>

      {/* Send or Cancel Button */}
      {isLoading ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all animate-pulse"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all hover:shadow-sky-500/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
          <span className="text-[10px] opacity-75 font-mono ml-0.5">{sendShortcut}</span>
        </button>
      )}
    </div>
  );
};
