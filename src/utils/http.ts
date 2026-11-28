import { HttpMethod, KeyValuePair } from '../types';
import { generateId } from './id';

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
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
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
  switch (method?.toUpperCase()) {
    case 'GET':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'POST':
      return { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
    case 'PUT':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'PATCH':
      return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    case 'DELETE':
      return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
    case 'OPTIONS':
      return { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' };
    case 'HEAD':
      return { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    case 'ALL':
      return { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    case 'TRACE':
    case 'CONNECT':
    default:
      return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  }
}

export function getMethodBadgeClass(method: string): string {
  const color = getMethodColor(method as HttpMethod);
  return `${color.text} ${color.bg} ${color.border}`;
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
        id: matched ? matched.id : generateId(),
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
