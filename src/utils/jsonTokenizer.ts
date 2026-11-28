export type JsonTokenType =
  | 'key'
  | 'colon'
  | 'string'
  | 'boolean'
  | 'null'
  | 'number'
  | 'bracket'
  | 'comma'
  | 'other'
  | 'gap';

export interface JsonToken {
  type: JsonTokenType;
  value: string;
}

export interface JsonFoldRange {
  start: number;
  end: number;
  itemCount: number;
  isObject: boolean;
}

const JSON_TOKEN_REGEX =
  /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g;

/**
 * Tokenizes a single line of JSON text into typed syntax tokens.
 */
export function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  JSON_TOKEN_REGEX.lastIndex = 0;

  while ((match = JSON_TOKEN_REGEX.exec(line)) !== null) {
    if (match.index === JSON_TOKEN_REGEX.lastIndex) {
      JSON_TOKEN_REGEX.lastIndex++;
    }

    if (match.index > lastIndex) {
      tokens.push({
        type: 'gap',
        value: line.substring(lastIndex, match.index),
      });
    }

    const token = match[0];

    if (token.endsWith(':')) {
      const colonIdx = token.lastIndexOf(':');
      tokens.push({ type: 'key', value: token.substring(0, colonIdx) });
      tokens.push({ type: 'colon', value: token.substring(colonIdx) });
    } else if (token.startsWith('"')) {
      tokens.push({ type: 'string', value: token });
    } else if (token === 'true' || token === 'false') {
      tokens.push({ type: 'boolean', value: token });
    } else if (token === 'null') {
      tokens.push({ type: 'null', value: token });
    } else if (/^-?\d/.test(token)) {
      tokens.push({ type: 'number', value: token });
    } else if (token === '{' || token === '}' || token === '[' || token === ']') {
      tokens.push({ type: 'bracket', value: token });
    } else if (token === ',') {
      tokens.push({ type: 'comma', value: token });
    } else {
      tokens.push({ type: 'other', value: token });
    }

    lastIndex = JSON_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({
      type: 'gap',
      value: line.substring(lastIndex),
    });
  }

  return tokens;
}

/**
 * Computes collapsible fold ranges for formatted JSON lines.
 */
export function computeJsonFoldRanges(lines: string[]): Map<number, JsonFoldRange> {
  const ranges = new Map<number, JsonFoldRange>();
  const stack: { index: number; char: '{' | '[' }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const opensObj = line.endsWith('{') || line.endsWith('{,');
    const opensArr = line.endsWith('[') || line.endsWith('[,') || line === '[';

    if (opensObj) {
      stack.push({ index: i, char: '{' });
    } else if (opensArr) {
      stack.push({ index: i, char: '[' });
    }

    const closesObj =
      (line.startsWith('}') || line.startsWith('},') || line.endsWith('}') || line.endsWith('},')) && !opensObj;
    const closesArr =
      (line.startsWith(']') || line.startsWith('],') || line.endsWith(']') || line.endsWith('],')) && !opensArr;

    if (closesObj) {
      const top = stack.pop();
      if (top && top.char === '{' && i > top.index) {
        ranges.set(top.index, {
          start: top.index,
          end: i,
          itemCount: Math.max(0, i - top.index - 1),
          isObject: true,
        });
      }
    } else if (closesArr) {
      const top = stack.pop();
      if (top && top.char === '[' && i > top.index) {
        ranges.set(top.index, {
          start: top.index,
          end: i,
          itemCount: Math.max(0, i - top.index - 1),
          isObject: false,
        });
      }
    }
  }

  return ranges;
}

/**
 * Checks whether a raw string is valid JSON object/array or arbitrary JSON.
 */
export function isValidJsonString(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats response/body text into pretty-printed JSON if applicable.
 */
export function formatJsonString(data: any, rawText?: string): string {
  if (typeof data !== 'undefined') {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      // Fallback to rawText
    }
  }
  if (rawText) {
    try {
      return JSON.stringify(JSON.parse(rawText), null, 2);
    } catch {
      return rawText;
    }
  }
  return '';
}
