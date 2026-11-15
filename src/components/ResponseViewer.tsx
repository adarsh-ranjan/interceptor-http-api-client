import React, { useState } from 'react';
import { HttpResponse } from '../types';
import { formatBytes, formatDuration, getStatusColor } from '../utils/http';
import {
  Copy,
  Check,
  Clock,
  Database,
  Globe,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
  activeUrl?: string;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  activeUrl,
}) => {
  const [viewTab, setViewTab] = useState<'pretty' | 'raw' | 'headers' | 'tests'>('pretty');
  const [headerFilter, setHeaderFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!response) return;
    const content = response.isJson
      ? JSON.stringify(response.data, null, 2)
      : response.rawBody;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveResponse = async () => {
    if (!response) return;
    const content = response.isJson
      ? JSON.stringify(response.data, null, 2)
      : response.rawBody;
    const ext = response.isJson ? 'json' : 'txt';
    const fileName = `response_${Date.now()}.${ext}`;

    if (window.interceptor?.saveFileDialog) {
      await window.interceptor.saveFileDialog({
        defaultPath: fileName,
        content,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
    } else {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-[#0d1117] p-8">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute w-full h-full rounded-full bg-sky-500/10 animate-ping" />
          <div className="relative w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-200">Executing request...</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center truncate font-mono">
          {activeUrl || 'Connecting to host'}
        </p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-[#0d1117] p-8 text-center">
        <Globe className="w-12 h-12 stroke-[1.5] text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Response Yet</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Enter an endpoint URL above and hit <span className="text-sky-400 font-mono">Send</span> to inspect the HTTP status, timing, headers, and payload.
        </p>
      </div>
    );
  }

  const statusColor = getStatusColor(response.status);
  const headerKeys = Object.keys(response.headers || {});
  const filteredHeaderKeys = headerKeys.filter((k) =>
    k.toLowerCase().includes(headerFilter.toLowerCase()) ||
    String(response.headers[k]).toLowerCase().includes(headerFilter.toLowerCase())
  );

  const testResults = response.testResults || [];
  const passedTestsCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-xs">
      {/* Response Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          {response.status > 0 ? (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded border font-mono font-bold ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
            >
              <span>{response.status}</span>
              <span>{response.statusText}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded border font-mono font-bold bg-rose-500/15 text-rose-400 border-rose-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{response.error || 'Network Error'}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">{formatDuration(response.timeMs)}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">{formatBytes(response.sizeBytes)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSaveResponse}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-[#21262d]"
            title="Save response to file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-[#21262d]"
            title="Copy response body"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between px-3 border-b border-[#30363d] bg-[#161b22]/50">
        <div className="flex items-center">
          <button
            onClick={() => setViewTab('pretty')}
            className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
              viewTab === 'pretty'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pretty {response.isJson ? '(JSON)' : ''}
          </button>
          <button
            onClick={() => setViewTab('raw')}
            className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
              viewTab === 'raw'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw
          </button>
          <button
            onClick={() => setViewTab('headers')}
            className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
              viewTab === 'headers'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Headers ({headerKeys.length})
          </button>

          {testResults.length > 0 && (
            <button
              onClick={() => setViewTab('tests')}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                viewTab === 'tests'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Test Results</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  passedTestsCount === testResults.length
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {passedTestsCount}/{testResults.length}
              </span>
            </button>
          )}
        </div>

        {viewTab === 'headers' && (
          <div className="relative flex items-center py-1">
            <Search className="w-3 h-3 absolute left-2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter headers..."
              value={headerFilter}
              onChange={(e) => setHeaderFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded pl-6 pr-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 w-36"
            />
          </div>
        )}
      </div>

      {/* Response Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        {viewTab === 'pretty' && (
          <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text selection:bg-sky-500/30">
            {response.isJson
              ? JSON.stringify(response.data, null, 2)
              : response.rawBody || <span className="text-slate-500">Empty response body</span>}
          </pre>
        )}

        {viewTab === 'raw' && (
          <pre className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text selection:bg-sky-500/30">
            {response.rawBody || <span className="text-slate-500">Empty response body</span>}
          </pre>
        )}

        {viewTab === 'headers' && (
          <div className="border border-[#30363d] rounded-md overflow-hidden">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-[#161b22] text-slate-400 border-b border-[#30363d]">
                <tr>
                  <th className="py-1.5 px-3 font-semibold w-1/3">Header</th>
                  <th className="py-1.5 px-3 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50 bg-[#0d1117]">
                {filteredHeaderKeys.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-slate-500">
                      No matching headers
                    </td>
                  </tr>
                ) : (
                  filteredHeaderKeys.map((key) => (
                    <tr key={key} className="hover:bg-[#161b22]/50 transition-colors">
                      <td className="py-1 px-3 text-sky-400 font-medium select-text break-all">
                        {key}
                      </td>
                      <td className="py-1 px-3 text-slate-300 select-text break-all">
                        {response.headers[key]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewTab === 'tests' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/50">
              <span className="font-semibold text-slate-300">
                Assertion Breakdown
              </span>
              <span className="text-slate-400">
                {passedTestsCount} passed, {testResults.length - passedTestsCount} failed
              </span>
            </div>

            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-2.5 rounded-md border flex items-start gap-2.5 ${
                  result.passed
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                }`}
              >
                {result.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{result.name}</p>
                  {result.error && (
                    <p className="text-[11px] font-mono text-rose-400 mt-1 whitespace-pre-wrap">
                      {result.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
