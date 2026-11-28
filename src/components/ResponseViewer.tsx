import React, { useMemo, useState } from 'react';
import { HttpResponse } from '../types';
import { saveTextFile } from '../services/fileService';
import { useClipboard } from '../hooks/useClipboard';
import { formatBytes, formatDuration } from '../utils/http';
import { formatJsonString, isValidJsonString } from '../utils/jsonTokenizer';
import { JsonSyntaxViewer } from './JsonSyntaxViewer';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, XCircle } from 'lucide-react';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
  activeUrl?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class JsonErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackRaw?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallbackRaw?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[JsonSyntaxViewer Error]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 overflow-auto p-3 bg-[#1a1a1a]">
          <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded mb-2 flex items-center justify-between">
            <span>Syntax highlighting encountered an issue. Rendering plain formatted view.</span>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="text-amber-300 underline text-[10px] cursor-pointer"
            >
              Retry
            </button>
          </div>
          <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
            {this.props.fallbackRaw || 'Empty response'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function getSerializedResponseBody(response: HttpResponse): string {
  if (response.isJson && response.data !== undefined) {
    return formatJsonString(response.data, response.rawBody);
  }
  return response.rawBody || '';
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  activeUrl,
}) => {
  const [viewTab, setViewTab] = useState<'pretty' | 'raw' | 'preview' | 'headers' | 'tests'>('pretty');
  const [headerFilter] = useState('');
  const { copied, copy } = useClipboard(2000);

  const isJson = useMemo(() => {
    if (!response) return false;
    if (response.isJson) return true;
    if (response.contentType?.toLowerCase().includes('application/json')) return true;
    if (response.rawBody) {
      const trimmed = response.rawBody.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        return isValidJsonString(trimmed);
      }
    }
    return false;
  }, [response]);

  const handleCopy = () => {
    if (!response) return;
    copy(getSerializedResponseBody(response));
  };

  const handleSaveResponse = async () => {
    if (!response) return;
    const content = getSerializedResponseBody(response);
    const ext = response.isJson ? 'json' : 'txt';
    await saveTextFile({
      defaultPath: `response_${Date.now()}.${ext}`,
      content,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      mimeType: 'text/plain',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-[#1a1a1a] p-8">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute w-full h-full rounded-full bg-[#d99b26]/10 animate-ping" />
          <div className="relative w-8 h-8 rounded-full border-2 border-[#d99b26] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-[#cccccc]">Executing request...</p>
        <p className="text-xs text-[#888888] mt-1 max-w-sm text-center truncate font-mono">
          {activeUrl || 'Connecting to host'}
        </p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#888888] bg-[#1a1a1a] p-8 select-none">
        <div className="text-[#333333] mb-6 flex justify-center">
          <svg
            className="w-24 h-24 stroke-[#383a42] fill-none"
            viewBox="0 0 24 24"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </div>

        <div className="flex text-xs">
          <div className="flex flex-col items-end pr-4 space-y-1.5 text-[#888888]">
            <div>Send Request</div>
            <div>New Request</div>
            <div>Edit Environments</div>
          </div>
          <div className="flex flex-col pl-4 space-y-1.5 font-mono text-[#cccccc]">
            <div>⌘ + ↵</div>
            <div>⌘ + N</div>
            <div>⌘ + E</div>
          </div>
        </div>
      </div>
    );
  }

  const headerKeys = Object.keys(response.headers || {});
  const filteredHeaderKeys = headerKeys.filter(
    (k) =>
      k.toLowerCase().includes(headerFilter.toLowerCase()) ||
      String(response.headers[k]).toLowerCase().includes(headerFilter.toLowerCase())
  );

  const testResults = response.testResults || [];
  const passedTestsCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-xs">
      <div className="flex items-center justify-between px-3 border-b border-[#333333] bg-[#1a1a1a] select-none gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewTab('pretty')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              viewTab === 'pretty'
                ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Response</span>
          </button>

          <button
            onClick={() => setViewTab('raw')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 ${
              viewTab === 'raw'
                ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            Raw
          </button>

          <button
            onClick={() => setViewTab('headers')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              viewTab === 'headers'
                ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Headers</span>
            {headerKeys.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#26292b] text-[#aaaaaa] text-[10px] font-mono">
                {headerKeys.length}
              </span>
            )}
          </button>

          {testResults.length > 0 && (
            <button
              onClick={() => setViewTab('tests')}
              className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                viewTab === 'tests'
                  ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                  : 'border-transparent text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              <span>Tests</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${
                  passedTestsCount === testResults.length
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {passedTestsCount}/{testResults.length}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {response.status > 0 ? (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-emerald-400">
                {response.status} {response.statusText}
              </span>
              <span className="text-[#666666]">•</span>
              <span className="text-[#999999]">{formatDuration(response.timeMs)}</span>
              <span className="text-[#666666]">•</span>
              <span className="text-[#999999]">{formatBytes(response.sizeBytes)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{response.error || 'Network Error'}</span>
            </div>
          )}

          <div className="w-px h-3.5 bg-[#333333]" />

          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveResponse}
              className="p-1 text-[#888888] hover:text-white transition-colors rounded hover:bg-[#26292b] cursor-pointer"
              title="Save response to file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopy}
              className="p-1 text-[#888888] hover:text-white transition-colors rounded hover:bg-[#26292b] cursor-pointer"
              title="Copy response body"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {viewTab === 'pretty' &&
          (isJson ? (
            <JsonErrorBoundary fallbackRaw={response.rawBody}>
              <JsonSyntaxViewer data={response.data} rawText={response.rawBody} onCopy={handleCopy} />
            </JsonErrorBoundary>
          ) : (
            <div className="flex-1 overflow-auto p-3">
              <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text selection:bg-orange-500/30">
                {response.rawBody || <span className="text-slate-500">Empty response body</span>}
              </pre>
            </div>
          ))}

        {viewTab === 'raw' && (
          <div className="flex-1 overflow-auto p-3">
            <pre className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text selection:bg-orange-500/30">
              {response.rawBody || <span className="text-slate-500">Empty response body</span>}
            </pre>
          </div>
        )}

        {viewTab === 'preview' && (
          <div className="flex-1 bg-white p-2 overflow-hidden">
            <iframe
              title="HTML Preview"
              srcDoc={response.rawBody}
              sandbox="allow-same-origin"
              className="w-full h-full border-0 rounded"
            />
          </div>
        )}

        {viewTab === 'headers' && (
          <div className="flex-1 overflow-auto p-3">
            <div className="border border-[#333333] rounded overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#222224] text-[#888888] border-b border-[#333333]">
                  <tr>
                    <th className="py-1.5 px-3 font-semibold w-1/3">Header</th>
                    <th className="py-1.5 px-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333] bg-[#1a1a1a]">
                  {filteredHeaderKeys.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-[#666666]">
                        No matching headers
                      </td>
                    </tr>
                  ) : (
                    filteredHeaderKeys.map((key) => (
                      <tr key={key} className="hover:bg-[#222224] transition-colors">
                        <td className="py-1.5 px-3 text-[#cccccc] font-medium select-text break-all">
                          {key}
                        </td>
                        <td className="py-1.5 px-3 text-[#999999] select-text break-all">
                          {response.headers[key]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewTab === 'tests' && (
          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
                <span className="font-semibold text-[#cccccc]">Assertion Breakdown</span>
                <span className="text-[#888888]">
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
          </div>
        )}
      </div>
    </div>
  );
};
