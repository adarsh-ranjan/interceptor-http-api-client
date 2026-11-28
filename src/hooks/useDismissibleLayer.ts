import { RefObject, useEffect } from 'react';

interface UseDismissibleLayerOptions {
  isOpen: boolean;
  onClose: () => void;
  refs: RefObject<HTMLElement | null>[];
  ignoreTargetSelector?: string;
  closeOnScroll?: boolean;
}

/**
 * Closes a floating dropdown/popover on outside click, Escape key, or scroll/resize.
 */
export function useDismissibleLayer({
  isOpen,
  onClose,
  refs,
  ignoreTargetSelector,
  closeOnScroll = true,
}: UseDismissibleLayerOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const isInsideRefs = (target: Node | null): boolean => {
      if (!target) return false;
      return refs.some((ref) => Boolean(ref.current && ref.current.contains(target)));
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (isInsideRefs(target)) return;
      if (ignoreTargetSelector && target?.closest(ignoreTargetSelector)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = (e: Event) => {
      if (isInsideRefs(e.target as Node | null)) return;
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    if (closeOnScroll) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      if (closeOnScroll) {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      }
    };
  }, [isOpen, onClose, refs, ignoreTargetSelector, closeOnScroll]);
}
