import { useCallback, useState } from 'react';
import { MAX_HISTORY_ITEMS, STORAGE_KEYS } from '../constants/defaults';
import { HistoryItem } from '../types';
import { getStorageJson, removeStorageItem, setStorageJson } from '../utils/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    getStorageJson<HistoryItem[]>(STORAGE_KEYS.HISTORY, [])
  );

  const addHistoryEntry = useCallback((entry: HistoryItem) => {
    setHistory((prev) => {
      const updated = [entry, ...prev.slice(0, MAX_HISTORY_ITEMS - 1)];
      setStorageJson(STORAGE_KEYS.HISTORY, updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    removeStorageItem(STORAGE_KEYS.HISTORY);
  }, []);

  return {
    history,
    addHistoryEntry,
    clearHistory,
  };
}
