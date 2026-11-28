import { useState } from 'react';
import { HistoryItem } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('interceptor_history', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('interceptor_history');
    } catch {
      // ignore
    }
  };

  return {
    history,
    setHistory,
    addHistoryItem,
    handleClearHistory,
  };
}
