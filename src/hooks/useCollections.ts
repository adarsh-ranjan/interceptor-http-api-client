import { useState } from 'react';
import { Collection } from '../types';
import { INITIAL_COLLECTIONS } from '../utils/defaults';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_collections');
      return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
    } catch {
      return INITIAL_COLLECTIONS;
    }
  });

  const updateCollections = (newCols: Collection[]) => {
    setCollections(newCols);
    try {
      localStorage.setItem('interceptor_collections', JSON.stringify(newCols));
    } catch {
      // ignore
    }
  };

  return {
    collections,
    updateCollections,
  };
}
