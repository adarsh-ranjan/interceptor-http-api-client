import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_EDITOR_RATIO,
  DEFAULT_SIDEBAR_WIDTH,
  STORAGE_KEYS,
} from '../constants/defaults';
import { getStorageItem, setStorageItem } from '../utils/storage';

export type WorkbenchLayout = 'horizontal' | 'vertical';

export function useLayoutPreferences() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = getStorageItem(STORAGE_KEYS.SIDEBAR_WIDTH);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed)
      ? Math.max(180, Math.min(550, parsed))
      : DEFAULT_SIDEBAR_WIDTH;
  });

  const [workbenchLayout, setWorkbenchLayout] = useState<WorkbenchLayout>(() => {
    const saved = getStorageItem(STORAGE_KEYS.WORKBENCH_LAYOUT);
    return saved === 'vertical' ? 'vertical' : 'horizontal';
  });

  const [editorRatio, setEditorRatio] = useState<number>(() => {
    const saved = getStorageItem(STORAGE_KEYS.EDITOR_RATIO);
    const parsed = saved ? parseFloat(saved) : NaN;
    return Number.isFinite(parsed)
      ? Math.max(0.2, Math.min(0.8, parsed))
      : DEFAULT_EDITOR_RATIO;
  });

  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingEditor, setIsDraggingEditor] = useState(false);
  const workbenchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SIDEBAR_WIDTH, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.WORKBENCH_LAYOUT, workbenchLayout);
  }, [workbenchLayout]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EDITOR_RATIO, editorRatio.toString());
  }, [editorRatio]);

  const handleStartSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingSidebar(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(180, Math.min(550, startWidth + (moveEvent.clientX - startX)));
        setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsDraggingSidebar(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [sidebarWidth]
  );

  const handleStartEditorResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const container = workbenchContainerRef.current;
      if (!container) return;

      setIsDraggingEditor(true);
      const rect = container.getBoundingClientRect();

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (workbenchLayout === 'horizontal') {
          const relativeX = moveEvent.clientX - rect.left;
          setEditorRatio(Math.max(0.2, Math.min(0.8, relativeX / rect.width)));
        } else {
          const relativeY = moveEvent.clientY - rect.top;
          setEditorRatio(Math.max(0.2, Math.min(0.8, relativeY / rect.height)));
        }
      };

      const onMouseUp = () => {
        setIsDraggingEditor(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [workbenchLayout]
  );

  const resetLayout = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    setEditorRatio(DEFAULT_EDITOR_RATIO);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    workbenchLayout,
    setWorkbenchLayout,
    editorRatio,
    setEditorRatio,
    isDraggingSidebar,
    isDraggingEditor,
    workbenchContainerRef,
    handleStartSidebarResize,
    handleStartEditorResize,
    resetLayout,
  };
}
