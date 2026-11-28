import React, { useState, useMemo } from 'react';
import { HttpResponse } from '../types';
import { formatBytes, formatDuration } from '../utils/http';
import { JsonSyntaxViewer } from './JsonSyntaxViewer';
import {
  Copy,
  Check,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { ResponseLoadingState } from './response/ResponseLoadingState';
import { ResponseEmptyState } from './response/ResponseEmptyState';
import { ResponseHeadersTab } from './response/ResponseHeadersTab';
import { ResponseTestsTab } from './response/ResponseTestsTab';

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
        <div className="flex-1 overflow-auto p-3 bg-card">
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
          <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
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
    <div className="flex flex-col h-full bg-card text-xs">
      {/* Response Bar */}
      <div className="flex items-center justify-between px-3 border-b border-border bg-card select-none gap-2 shrink-0">
        {/* Subtabs on left */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewTab('pretty')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              viewTab === 'pretty'
                ? 'border-amber-500 text-foreground font-medium -mb-px'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Response</span>
          </button>

          <button
            onClick={() => setViewTab('raw')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 ${
              viewTab === 'raw'
                ? 'border-amber-500 text-foreground font-medium -mb-px'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Raw
          </button>

          {isHtml && (
            <button
              onClick={() => setViewTab('preview')}
              className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 ${
                viewTab === 'preview'
                  ? 'border-amber-500 text-foreground font-medium -mb-px'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Preview
            </button>
          )}

          <button
            onClick={() => setViewTab('headers')}
            className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              viewTab === 'headers'
                ? 'border-amber-500 text-foreground font-medium -mb-px'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Headers</span>
            {headerKeys.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground text-[10px] font-mono">
                {headerKeys.length}
              </span>
            )}
          </button>

          {testResults.length > 0 && (
            <button
              onClick={() => setViewTab('tests')}
              className={`px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                viewTab === 'tests'
                  ? 'border-amber-500 text-foreground font-medium -mb-px'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Tests</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${
                passedTestsCount === testResults.length
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}>
                {passedTestsCount}/{testResults.length}
              </span>
            </button>
          )}
        </div>

        {/* Right side metadata & actions */}
        <div className="flex items-center gap-3">
          {response.status > 0 ? (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={`font-bold ${
                response.status >= 200 && response.status < 300
                  ? 'text-emerald-400'
                  : response.status >= 400
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}>
                {response.status} {response.statusText}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground">{formatDuration(response.timeMs)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground">{formatBytes(response.sizeBytes)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{response.error || 'Network Error'}</span>
            </div>
          )}

          <div className="w-px h-3.5 bg-border" />

          {/* Actions: Save & Copy */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSaveResponse}
              className="text-muted-foreground hover:text-foreground"
              title="Save response to file"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground"
              title="Copy response body"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Response Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewTab === 'pretty' && (
          isJson ? (
            <JsonErrorBoundary fallbackRaw={response.rawBody}>
              <JsonSyntaxViewer
                data={response.data}
                rawText={response.rawBody}
                onCopy={handleCopy}
              />
            </JsonErrorBoundary>
          ) : (
            <ScrollArea className="flex-1 p-3">
              <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text selection:bg-amber-500/30">
                {response.rawBody || <span className="text-muted-foreground">Empty response body</span>}
              </pre>
            </ScrollArea>
          )
        )}

        {viewTab === 'raw' && (
          <ScrollArea className="flex-1 p-3">
            <pre className="font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap select-text selection:bg-amber-500/30">
              {response.rawBody || <span className="text-muted-foreground">Empty response body</span>}
            </pre>
          </ScrollArea>
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
