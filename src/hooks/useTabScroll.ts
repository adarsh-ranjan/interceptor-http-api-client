import React, { useCallback, useEffect, useRef, useState } from 'react';

interface UseTabScrollOptions {
  activeTabId: string;
  itemCount: number;
  scrollStepPx?: number;
}

export function useTabScroll({
  activeTabId,
  itemCount,
  scrollStepPx = 220,
}: UseTabScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const overflow = el.scrollWidth > el.clientWidth + 1;
    setIsOverflowing(overflow);
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollState, itemCount]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const activeEl = el.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    const frame = requestAnimationFrame(updateScrollState);
    return () => cancelAnimationFrame(frame);
  }, [activeTabId, itemCount, updateScrollState]);

  const scrollTabs = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollContainerRef.current;
      if (!el) return;

      el.scrollBy({
        left: direction === 'left' ? -scrollStepPx : scrollStepPx,
        behavior: 'smooth',
      });
    },
    [scrollStepPx]
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  }, []);

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    isOverflowing,
    updateScrollState,
    scrollTabs,
    handleWheel,
  };
}
