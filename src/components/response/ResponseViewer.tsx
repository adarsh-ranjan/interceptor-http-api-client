import React, { useState, useMemo } from 'react';
import { HttpResponse } from '../../types';
import { formatBytes, formatDuration, getStatusColor } from '../../utils/http';
import { JsonSyntaxViewer } from '../JsonSyntaxViewer';
import {
  Copy,
  Check,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { ResponseLoadingState } from './ResponseLoadingState';
import { ResponseEmptyState } from './ResponseEmptyState';
import { ResponseHeadersTab } from './ResponseHeadersTab';
import { ResponseTestsTab } from './ResponseTestsTab';

export interface ResponseViewerProps {
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

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  activeUrl,
}) => {
  const [viewTab, setViewTab] = useState<'pretty' | 'raw' | 'preview' | 'headers' | 'tests'>('pretty');
  const [copied, setCopied] = useState(false);

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
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }, [response]);

  const isHtml = useMemo(() => {
    if (!response) return false;
    if (response.contentType?.toLowerCase().includes('text/html')) return true;
    if (response.rawBody) {
      const lower = response.rawBody.trim().toLowerCase();
      return lower.startsWith('<!doctype html') || lower.startsWith('<html');
    }
    return false;
  }, [response]);

  const handleCopy = () => {
    if (!response) return;
    let content = response.rawBody || '';
    if (response.isJson && response.data !== undefined) {
      try {
        content = JSON.stringify(response.data, null, 2);
      } catch {
        content = response.rawBody || '';
      }
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveResponse = async () => {
    if (!response) return;
    let content = response.rawBody || '';
    if (response.isJson && response.data !== undefined) {
      try {
        content = JSON.stringify(response.data, null, 2);
      } catch {
        content = response.rawBody || '';
      }
    }
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
    return <ResponseLoadingState activeUrl={activeUrl} />;
  }

  if (!response) {
    return <ResponseEmptyState />;
  }

  const headerKeys = Object.keys(response.headers || {});
  const testResults = response.testResults || [];
  const passedTestsCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-xs">
      {/* Response Bar (Bruno-Style integrated tabs + metadata row) */}
      <div className="flex items-center justify-between px-3 border-b border-[#333333] bg-[#1a1a1a] select-none gap-2 shrink-0">
        {/* Subtabs on left */}
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

          {isHtml && (
            <button
              onClick={() => setViewTab('preview')}
              className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 ${
                viewTab === 'preview'
                  ? 'border-[#d99b26] text-[#cccccc] font-medium -mb-px'
                  : 'border-transparent text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              Preview
            </button>
          )}

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

        {/* Right side metadata & actions (Bruno Status, Duration, Size) */}
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

          {/* Actions: Save & Copy */}
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

      {/* Response Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewTab === 'pretty' &&
          (isJson ? (
            <JsonErrorBoundary fallbackRaw={response.rawBody}>
              <JsonSyntaxViewer
                data={response.data}
                rawText={response.rawBody}
                onCopy={handleCopy}
              />
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
          <ResponseHeadersTab headers={response.headers || {}} />
        )}

        {viewTab === 'tests' && (
          <ResponseTestsTab testResults={testResults} />
        )}
      </div>
    </div>
  );
};
