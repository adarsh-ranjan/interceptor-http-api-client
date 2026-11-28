import { useEffect, useState } from 'react';
import { getIsWindowMaximized, subscribeToWindowState } from '../services/windowService';

export function useWindowMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    getIsWindowMaximized().then(setIsMaximized);
    return subscribeToWindowState(setIsMaximized);
  }, []);

  return isMaximized;
}
