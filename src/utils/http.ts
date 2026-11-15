import { HttpMethod, KeyValuePair } from '../types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function getStatusColor(status: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (status >= 200 && status < 300) {
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    };
  }
  if (status >= 300 && status < 400) {
    return {
      bg: 'bg-sky-500/15',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
    };
  }
  if (status >= 400 && status < 500) {
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    };
  }
  if (status >= 500) {
    return {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
    };
  }
  return {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  };
}

export function getMethodColor(method: HttpMethod): {
  text: string;
  bg: string;
  border: string;
} {
  switch (method) {
    case 'GET':
      return { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
    case 'POST':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'PUT':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'PATCH':
      return { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    case 'DELETE':
      return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
    default:
      return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  }
}

export function syncUrlWithParams(baseUrl: string, params: KeyValuePair[]): string {
  try {
    const questionIndex = baseUrl.indexOf('?');
    const cleanUrl = questionIndex !== -1 ? baseUrl.substring(0, questionIndex) : baseUrl;
    const activeParams = params.filter((p) => p.enabled && p.key.trim() !== '');

    if (activeParams.length === 0) {
      return cleanUrl;
    }

    const queryParts = activeParams.map(
      (p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`
    );

    return `${cleanUrl}?${queryParts.join('&')}`;
  } catch {
    return baseUrl;
  }
}

export function extractParamsFromUrl(url: string, existingParams: KeyValuePair[] = []): KeyValuePair[] {
  try {
    const questionIndex = url.indexOf('?');
    if (questionIndex === -1) return [];

    const queryString = url.substring(questionIndex + 1);
    const searchParams = new URLSearchParams(queryString);
    const newParams: KeyValuePair[] = [];

    searchParams.forEach((val, key) => {
      // Preserve ID if it already existed in existingParams
      const matched = existingParams.find((p) => p.key === key);
      newParams.push({
        id: matched ? matched.id : Math.random().toString(36).substring(2, 9),
        key,
        value: val,
        enabled: true,
      });
    });

    return newParams;
  } catch {
    return existingParams;
  }
}

export function keyValuesToRecord(pairs: KeyValuePair[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    if (pair.enabled && pair.key.trim() !== '') {
      result[pair.key.trim()] = pair.value.trim();
    }
  }
  return result;
}
