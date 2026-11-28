import { useCallback, useEffect, useRef, useState } from 'react';

export function useClipboard(resetDelayMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetDelayMs);
      } catch {
        // Ignore clipboard errors
      }
    },
    [resetDelayMs]
  );

  return { copied, copy };
}

export function useKeyedClipboard<K extends string = string>(resetDelayMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<K | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (key: K, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopiedKey(null), resetDelayMs);
      } catch {
        // Ignore clipboard errors
      }
    },
    [resetDelayMs]
  );

  return { copiedKey, copy };
}
