import { useCallback, useState } from 'react';
import { ToastData } from '../components/Toast';
import { generateId } from '../utils/id';

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((toastData: Omit<ToastData, 'id'>) => {
    setToast({
      ...toastData,
      id: generateId(),
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
