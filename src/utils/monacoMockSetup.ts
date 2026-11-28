import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco to use locally bundled monaco-editor for 100% offline Electron support
loader.config({ monaco });

const RUNTIME_DECLARATIONS = `
/**
 * Incoming HTTP Request Object
 */
declare const req: {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string | string[]>;
  method: string;
  path: string;
  url: string;
};

/**
 * Outgoing HTTP Response Builder
 */
declare const res: {
  status(code: number): typeof res;
  json(data: any): typeof res;
  send(data: any): typeof res;
  setHeader(name: string, value: string): typeof res;
  setHeaders(headers: Record<string, string>): typeof res;
  end(data?: any): typeof res;
};

declare const store: Record<string, any>;

declare const utils: {
  uuid(): string;
  timestamp(): number;
  isoTimestamp(): string;
  randomInt(min: number, max: number): number;
  sleep(ms: number): Promise<void>;
};
`;

let hasConfiguredMonacoTheme = false;
let hasConfiguredMonacoCompletion = false;
let hasConfiguredTypeScript = false;

function buildCompletionSuggestions(
  m: typeof monaco,
  textUntilPosition: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  if (textUntilPosition.endsWith('req.')) {
    return [
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
      },
    ];
  }

  if (textUntilPosition.endsWith('res.')) {
    return [
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
        insertText: "setHeader('${1:Content-Type}', '${2:application/json}')",
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
        insertText: "setHeaders({\\n  '${1:X-Custom-Header}': '${2:value}'\\n})",
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
      },
    ];
  }

  if (textUntilPosition.endsWith('utils.')) {
    return [
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
      },
    ];
  }

  return [
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
    {
      label: 'res-json',
      kind: m.languages.CompletionItemKind.Snippet,
      insertText: 'res.status(${1:200}).json({\\n  ${2:key}: ${3:"value"}\\n});',
      insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: 'Snippet: Return JSON Response',
      documentation: { value: 'Outputs a standard JSON response with status code.' },
      range,
    },
    {
      label: 'res-error',
      kind: m.languages.CompletionItemKind.Snippet,
      insertText:
        'res.status(${1:400}).json({\\n  error: "${2:Bad Request}",\\n  message: "${3:Invalid request payload}"\\n});',
      insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: 'Snippet: Return Error Response',
      documentation: { value: 'Returns an HTTP error response (400/404/500).' },
      range,
    },
    {
      label: 'sleep-delay',
      kind: m.languages.CompletionItemKind.Snippet,
      insertText:
        'await utils.sleep(${1:1000});\\nres.status(200).json({ status: "success", delayedByMs: ${1:1000} });',
      insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: 'Snippet: Simulate Latency Delay',
      documentation: { value: 'Asynchronously delay the response using `await utils.sleep(ms)`.' },
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
      documentation: { value: 'Full REST CRUD handling with in-memory persistence across requests.' },
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
      documentation: { value: 'Validates Authorization header and responds with 401 if missing.' },
      range,
    },
  ];
}

export function setupMonacoGlobalEnvironment(m: typeof monaco): void {
  if (!hasConfiguredTypeScript) {
    const ts = (m as any).typescript || (m.languages as any)?.typescript || (monaco as any).typescript;
    if (ts?.javascriptDefaults) {
      try {
        ts.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });

        const target =
          ts.ScriptTarget?.ES2022 ?? (m.languages as any)?.typescript?.ScriptTarget?.ES2022 ?? 99;
        const moduleResolution =
          ts.ModuleResolutionKind?.NodeJs ??
          (m.languages as any)?.typescript?.ModuleResolutionKind?.NodeJs ??
          2;
        const moduleKind =
          ts.ModuleKind?.CommonJS ?? (m.languages as any)?.typescript?.ModuleKind?.CommonJS ?? 1;

        ts.javascriptDefaults.setCompilerOptions({
          target,
          allowNonTsExtensions: true,
          moduleResolution,
          module: moduleKind,
          noEmit: true,
          lib: ['es2022'],
        });

        ts.javascriptDefaults.addExtraLib(
          RUNTIME_DECLARATIONS,
          'ts:filename/interceptor-mock-sandbox.d.ts'
        );
        hasConfiguredTypeScript = true;
      } catch (err) {
        console.warn('Monaco JavaScript defaults setup warning:', err);
      }
    }
  }

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

          return {
            suggestions: buildCompletionSuggestions(m, textUntilPosition, range),
          };
        },
      });
      hasConfiguredMonacoCompletion = true;
    } catch {
      // Already registered
    }
  }
}
