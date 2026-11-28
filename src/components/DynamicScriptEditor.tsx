import React, { useRef, useState, useEffect } from 'react';
import Editor, { loader, OnMount, BeforeMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Code2, Wand2, Copy, Check, Info } from 'lucide-react';

// Configure Monaco to use locally bundled monaco-editor for 100% offline Electron support
loader.config({ monaco });

// TypeScript declaration string for Sandbox Globals with rich JSDoc
const RUNTIME_DECLARATIONS = `
/**
 * Incoming HTTP Request Object
 */
declare const req: {
  /**
   * Route path parameters extracted from URL pattern (e.g. \`/users/:id\` -> \`req.params.id\`).
   * @example const { id } = req.params;
   */
  params: Record<string, string>;

  /**
   * Parsed URL query string parameters (e.g. \`?search=term\` -> \`req.query.search\`).
   * @example const query = req.query.search || '';
   */
  query: Record<string, string>;

  /**
   * Parsed JSON payload or raw request body string.
   * @example const { name, email } = req.body;
   */
  body: any;

  /**
   * Incoming HTTP request headers as lowercase key-value pairs.
   * @example const auth = req.headers['authorization'];
   */
  headers: Record<string, string | string[]>;

  /**
   * HTTP method of the incoming request (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD).
   * @example if (req.method === 'POST') { ... }
   */
  method: string;

  /**
   * Request URL pathname without query string (e.g. \`/api/users/123\`).
   */
  path: string;

  /**
   * Full raw incoming request URL including query string.
   */
  url: string;
};

/**
 * Outgoing HTTP Response Builder
 */
declare const res: {
  /**
   * Sets the HTTP response status code.
   * @param code HTTP status code (200, 201, 400, 401, 403, 404, 500, etc.)
   * @returns Response builder for method chaining
   * @example res.status(201).json({ created: true });
   */
  status(code: number): typeof res;

  /**
   * Sends a JSON response with Content-Type: application/json.
   * @param data Any serializable JavaScript object, array, or primitive
   * @returns Response builder for method chaining
   * @example res.status(200).json({ ok: true, data: [] });
   */
  json(data: any): typeof res;

  /**
   * Sends raw text, HTML, or primitive response body.
   * @param data Text or primitive response
   * @returns Response builder for method chaining
   * @example res.send("OK");
   */
  send(data: any): typeof res;

  /**
   * Sets a single response header.
   * @param name Header name (case-insensitive)
   * @param value Header value
   * @returns Response builder for method chaining
   * @example res.setHeader('X-Custom-Header', 'my-value');
   */
  setHeader(name: string, value: string): typeof res;

  /**
   * Sets multiple response headers at once.
   * @param headers Object containing key-value header pairs
   * @returns Response builder for method chaining
   * @example res.setHeaders({ 'X-Rate-Limit': '100', 'Cache-Control': 'no-cache' });
   */
  setHeaders(headers: Record<string, string>): typeof res;

  /**
   * Ends the HTTP response immediately without writing further data.
   * @param data Optional final data chunk to send
   * @returns Response builder for method chaining
   * @example res.status(204).end();
   */
  end(data?: any): typeof res;
};

/**
 * Shared In-Memory Key-Value State
 * Persisted across all requests handled by this mock server until cleared or server restarted.
 * Ideal for simulating stateful REST CRUD APIs, user sessions, or counters.
 * @example
 * store.items = store.items || [];
 * store.items.push(req.body);
 * res.status(201).json(req.body);
 */
declare const store: Record<string, any>;

/**
 * Built-in Mock Server Helper Utilities
 */
declare const utils: {
  /**
   * Generates a standard RFC4122 v4 UUID string.
   * @returns A random UUID string, e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   * @example const newId = utils.uuid();
   */
  uuid(): string;

  /**
   * Returns the current Unix epoch time in milliseconds.
   * @returns Current timestamp in ms (Date.now())
   * @example const now = utils.timestamp();
   */
  timestamp(): number;

  /**
   * Returns current UTC timestamp in ISO 8601 string format.
   * @returns e.g. "2026-11-27T17:40:00.000Z"
   * @example const createdAt = utils.isoTimestamp();
   */
  isoTimestamp(): string;

  /**
   * Generates a cryptographically random integer between min and max (inclusive).
   * @param min Minimum integer (inclusive)
   * @param max Maximum integer (inclusive)
   * @returns Random integer in [min, max]
   * @example const val = utils.randomInt(1, 100);
   */
  randomInt(min: number, max: number): number;

  /**
   * Asynchronously pauses execution for the specified milliseconds to simulate latency.
   * @param ms Milliseconds to delay
   * @returns Promise resolving after ms
   * @example await utils.sleep(800);
   */
  sleep(ms: number): Promise<void>;
};
`;

let hasConfiguredMonacoTheme = false;
let hasConfiguredMonacoCompletion = false;
let hasConfiguredTypeScript = false;

function setupMonacoGlobalEnvironment(m: typeof monaco) {
  // 1. TypeScript & JavaScript Language Service Diagnostics & Compiler Options
  if (!hasConfiguredTypeScript) {
    const ts = (m as any).typescript || (m.languages as any)?.typescript || (monaco as any).typescript;
    if (ts?.javascriptDefaults) {
      try {
        ts.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });

        const target = ts.ScriptTarget?.ES2022 ?? (m.languages as any)?.typescript?.ScriptTarget?.ES2022 ?? 99;
        const moduleResolution = ts.ModuleResolutionKind?.NodeJs ?? (m.languages as any)?.typescript?.ModuleResolutionKind?.NodeJs ?? 2;
        const moduleKind = ts.ModuleKind?.CommonJS ?? (m.languages as any)?.typescript?.ModuleKind?.CommonJS ?? 1;

        ts.javascriptDefaults.setCompilerOptions({
          target,
          allowNonTsExtensions: true,
          moduleResolution,
          module: moduleKind,
          noEmit: true,
          lib: ['es2022'],
        });

        const libUri = 'ts:filename/interceptor-mock-sandbox.d.ts';
        ts.javascriptDefaults.addExtraLib(RUNTIME_DECLARATIONS, libUri);
        hasConfiguredTypeScript = true;
      } catch (err) {
        console.warn('Monaco JavaScript defaults setup warning:', err);
      }
    }
  }

  // 2. Define Interceptor VSCode Dark Theme
  if (!hasConfiguredMonacoTheme) {
    try {
      m.editor.defineTheme('interceptor-vscode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'keyword.control', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'identifier', foreground: 'abb2bf' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'delimiter', foreground: 'abb2bf' },
      { token: 'variable.parameter', foreground: 'e06c75' },
    ],
    colors: {
      'editor.background': '#141517',
      'editor.foreground': '#cccccc',
      'editor.lineHighlightBackground': '#1a1b1e',
      'editor.lineHighlightBorder': '#25282d',
      'editorCursor.foreground': '#d99b26',
      'editorLineNumber.foreground': '#555555',
      'editorLineNumber.activeForeground': '#d99b26',
      'editor.selectionBackground': '#264f7866',
      'editor.inactiveSelectionBackground': '#3a3d4144',
      'editorGutter.background': '#141517',
      'editorWidget.background': '#1e1f22',
      'editorWidget.border': '#333333',
      'editorSuggestWidget.background': '#1e1f22',
      'editorSuggestWidget.border': '#333333',
      'editorSuggestWidget.foreground': '#cccccc',
      'editorSuggestWidget.selectedBackground': '#2c313a',
      'editorSuggestWidget.highlightForeground': '#d99b26',
      'editorHoverWidget.background': '#1e1f22',
      'editorHoverWidget.border': '#333333',
      'editorHoverWidget.foreground': '#cccccc',
    },
      });
      hasConfiguredMonacoTheme = true;
    } catch {
      // Theme already defined
    }
  }

  // 3. Register Dedicated Completion Item Provider for Instantaneous IntelliSense
  if (!hasConfiguredMonacoCompletion) {
    try {
      m.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', 'r', 'u', 's', 'j', 'e', 'a'],
    provideCompletionItems: (model, position) => {
      const wordInfo = model.getWordUntilPosition(position);
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1).trim();

      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endColumn: wordInfo.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [];

      // Context 1: Member completion after "req."
      if (textUntilPosition.endsWith('req.')) {
        suggestions.push(
          {
            label: 'params',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'params',
            detail: 'req.params: Record<string, string>',
            documentation: {
              value: '**Extracted URL Path Parameters**\n\ne.g. Route `/users/:id` -> `req.params.id`',
            },
            range,
          },
          {
            label: 'query',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'query',
            detail: 'req.query: Record<string, string>',
            documentation: {
              value: '**Parsed URL Query Parameters**\n\ne.g. URL `?search=hello` -> `req.query.search`',
            },
            range,
          },
          {
            label: 'body',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'body',
            detail: 'req.body: any',
            documentation: {
              value: '**Parsed Request Body**\n\nJSON object payload if Content-Type is json, or raw string.',
            },
            range,
          },
          {
            label: 'headers',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'headers',
            detail: 'req.headers: Record<string, string>',
            documentation: {
              value: '**Incoming Request Headers**\n\nLowercase header key-value dictionary (e.g. `req.headers["authorization"]`).',
            },
            range,
          },
          {
            label: 'method',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'method',
            detail: 'req.method: string',
            documentation: {
              value: '**HTTP Method**\n\ne.g. `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc.',
            },
            range,
          },
          {
            label: 'path',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'path',
            detail: 'req.path: string',
            documentation: {
              value: '**Request URL Pathname**\n\ne.g. `"/api/users/123"` (without query string).',
            },
            range,
          },
          {
            label: 'url',
            kind: m.languages.CompletionItemKind.Property,
            insertText: 'url',
            detail: 'req.url: string',
            documentation: {
              value: '**Full Request URL**\n\nRaw URL string including query parameters.',
            },
            range,
          }
        );
        return { suggestions };
      }

      // Context 2: Member completion after "res."
      if (textUntilPosition.endsWith('res.')) {
        suggestions.push(
          {
            label: 'status',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'status(${1:200})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.status(code: number): res',
            documentation: {
              value: '**Set HTTP Status Code**\n\nSets the response status code (e.g. `200`, `201`, `400`, `404`, `500`). Chained with `.json()` or `.send()`.',
            },
            range,
          },
          {
            label: 'json',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'json(${1:{\\n  status: "ok"\\n\\}})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.json(data: any): res',
            documentation: {
              value: '**Send JSON Response**\n\nSerializes payload into JSON and sets `Content-Type: application/json`.',
            },
            range,
          },
          {
            label: 'send',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'send(${1:"OK"})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.send(data: any): res',
            documentation: {
              value: '**Send Raw Text / Primitive**\n\nSends raw string or primitive response body.',
            },
            range,
          },
          {
            label: 'setHeader',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'setHeader(\'${1:Content-Type}\', \'${2:application/json}\')',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.setHeader(name: string, value: string): res',
            documentation: {
              value: '**Set Single Header**\n\nSets an outgoing HTTP response header.',
            },
            range,
          },
          {
            label: 'setHeaders',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'setHeaders({\\n  \'${1:X-Custom-Header}\': \'${2:value}\'\\n})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.setHeaders(headers: Record<string, string>): res',
            documentation: {
              value: '**Set Multiple Headers**\n\nSets multiple outgoing headers at once.',
            },
            range,
          },
          {
            label: 'end',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'end(${1})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'res.end(data?: any): res',
            documentation: {
              value: '**End Response**\n\nImmediately finishes transmission without additional writing.',
            },
            range,
          }
        );
        return { suggestions };
      }

      // Context 3: Member completion after "utils."
      if (textUntilPosition.endsWith('utils.')) {
        suggestions.push(
          {
            label: 'uuid',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'uuid()',
            detail: 'utils.uuid(): string',
            documentation: {
              value: '**Generate UUID v4**\n\nReturns a random RFC4122 v4 UUID string, e.g. `"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"`.',
            },
            range,
          },
          {
            label: 'isoTimestamp',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'isoTimestamp()',
            detail: 'utils.isoTimestamp(): string',
            documentation: {
              value: '**ISO Timestamp String**\n\nReturns current UTC timestamp in ISO 8601 format (e.g. `2026-11-27T17:40:00.000Z`).',
            },
            range,
          },
          {
            label: 'timestamp',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'timestamp()',
            detail: 'utils.timestamp(): number',
            documentation: {
              value: '**Unix Epoch Milliseconds**\n\nReturns current Unix timestamp in ms (`Date.now()`).',
            },
            range,
          },
          {
            label: 'randomInt',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'randomInt(${1:1}, ${2:100})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'utils.randomInt(min: number, max: number): number',
            documentation: {
              value: '**Random Integer**\n\nGenerates a random integer between `min` and `max` inclusive.',
            },
            range,
          },
          {
            label: 'sleep',
            kind: m.languages.CompletionItemKind.Method,
            insertText: 'sleep(${1:1000})',
            insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'await utils.sleep(ms: number): Promise<void>',
            documentation: {
              value: '**Simulate Delay / Latency**\n\nPauses execution for specified milliseconds to simulate network latency or slow endpoints.',
            },
            range,
          }
        );
        return { suggestions };
      }

      // Context 4: Top-level Globals & Rich Snippets
      suggestions.push(
        {
          label: 'req',
          kind: m.languages.CompletionItemKind.Variable,
          insertText: 'req',
          detail: 'Incoming Request (params, query, body, headers, method, path, url)',
          documentation: {
            value: '**Request Object**\n\nContains `params`, `query`, `body`, `headers`, `method`, `path`, and `url`.',
          },
          range,
        },
        {
          label: 'res',
          kind: m.languages.CompletionItemKind.Variable,
          insertText: 'res',
          detail: 'Response Builder (status, json, send, setHeader, end)',
          documentation: {
            value: '**Response Object**\n\nProvides fluent methods like `.status(200).json(...)` to formulate HTTP responses.',
          },
          range,
        },
        {
          label: 'store',
          kind: m.languages.CompletionItemKind.Variable,
          insertText: 'store',
          detail: 'In-Memory Key-Value State across requests',
          documentation: {
            value: '**Persistent Server Store**\n\nShared memory preserved across all requests for this mock server. Ideal for CRUD state.',
          },
          range,
        },
        {
          label: 'utils',
          kind: m.languages.CompletionItemKind.Variable,
          insertText: 'utils',
          detail: 'Mock Server Utilities (uuid, sleep, randomInt, isoTimestamp, timestamp)',
          documentation: {
            value: '**Utility Functions**\n\nIncludes `uuid()`, `sleep(ms)`, `randomInt(min, max)`, `isoTimestamp()`, and `timestamp()`.',
          },
          range,
        },
        // Rich Mock Snippets
        {
          label: 'res-json',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: 'res.status(${1:200}).json({\\n  ${2:key}: ${3:"value"}\\n});',
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Snippet: Return JSON Response',
          documentation: {
            value: 'Outputs a standard JSON response with status code.',
          },
          range,
        },
        {
          label: 'res-error',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: 'res.status(${1:400}).json({\\n  error: "${2:Bad Request}",\\n  message: "${3:Invalid request payload}"\\n});',
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Snippet: Return Error Response',
          documentation: {
            value: 'Returns an HTTP error response (400/404/500).',
          },
          range,
        },
        {
          label: 'sleep-delay',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: 'await utils.sleep(${1:1000});\\nres.status(200).json({ status: "success", delayedByMs: ${1:1000} });',
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Snippet: Simulate Latency Delay',
          documentation: {
            value: 'Asynchronously delay the response using `await utils.sleep(ms)`.',
          },
          range,
        },
        {
          label: 'store-crud',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: [
            'store.items = store.items || [];',
            'if (req.method === "POST") {',
            '  const newItem = { id: utils.uuid(), ...req.body, createdAt: utils.isoTimestamp() };',
            '  store.items.push(newItem);',
            '  return res.status(201).json(newItem);',
            '}',
            'res.status(200).json({ total: store.items.length, items: store.items });',
          ].join('\\n'),
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Snippet: In-Memory REST CRUD Handler',
          documentation: {
            value: 'Full REST CRUD handling with in-memory persistence across requests.',
          },
          range,
        },
        {
          label: 'auth-bearer-check',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: [
            'const auth = req.headers["authorization"];',
            'if (!auth || !auth.startsWith("Bearer ")) {',
            '  return res.status(401).json({ error: "Unauthorized", message: "Bearer token required" });',
            '}',
            'res.status(200).json({ status: "authenticated", user: "mock-user" });',
          ].join('\\n'),
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Snippet: Bearer Token Authorization Check',
          documentation: {
            value: 'Validates Authorization header and responds with 401 if missing.',
          },
          range,
        }
      );

      return { suggestions };
    },
  });
      hasConfiguredMonacoCompletion = true;
    } catch {
      // Already registered
    }
  }
}

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
  const [copied, setCopied] = useState(false);

  const handleBeforeMount: BeforeMount = (m) => {
    setupMonacoGlobalEnvironment(m);
  };

  const handleEditorDidMount: OnMount = (editor, m) => {
    editorRef.current = editor;

    setupMonacoGlobalEnvironment(m);

    // Track cursor position for VSCode status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // Make sure the theme is applied
    m.editor.setTheme('interceptor-vscode-dark');
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex-1 flex flex-col border border-[#333333] rounded overflow-hidden bg-[#141517]">
      {/* Editor VSCode Style Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b1e] border-b border-[#282a2d] text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#d99b26] font-medium">
            <Code2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-semibold tracking-wide">JavaScript Route Handler</span>
          </div>
          <span className="text-[10px] text-[#666666] hidden sm:inline">• VSCode Monaco Engine (ES2022)</span>
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
            onClick={handleCopyCode}
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

      {/* Monaco Editor Container */}
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
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, "Courier New", monospace',
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
