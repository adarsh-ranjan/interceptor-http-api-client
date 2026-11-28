import { useState, useEffect, useRef, useCallback } from 'react';

export function useLayoutState() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('interceptor_sidebar_width');
      return saved ? Math.max(180, Math.min(550, parseInt(saved, 10))) : 260;
    } catch {
      return 260;
    }
  });

  const [workbenchLayout, setWorkbenchLayout] = useState<'horizontal' | 'vertical'>(() => {
    try {
      const saved = localStorage.getItem('interceptor_workbench_layout');
      return saved === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [editorRatio, setEditorRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('interceptor_editor_ratio');
      return saved ? Math.max(0.2, Math.min(0.8, parseFloat(saved))) : 0.5;
    } catch {
      return 0.5;
    }
  });

  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingEditor, setIsDraggingEditor] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const workbenchContainerRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('interceptor_sidebar_width', sidebarWidth.toString());
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('interceptor_workbench_layout', workbenchLayout);
    } catch {
      // ignore
    }
  }, [workbenchLayout]);

  useEffect(() => {
    try {
      localStorage.setItem('interceptor_editor_ratio', editorRatio.toString());
    } catch {
      // ignore
    }
  }, [editorRatio]);

  // Window Maximized Listener
  useEffect(() => {
    if (window.interceptor?.isMaximized) {
      window.interceptor.isMaximized().then(setIsMaximized);
    }

    let unsubscribe: (() => void) | undefined;
    if (window.interceptor?.onWindowStateChange) {
      unsubscribe = window.interceptor.onWindowStateChange((maximized) => {
        setIsMaximized(maximized);
      });
    }

    const handleResize = () => {
      if (window.interceptor?.isMaximized) {
        window.interceptor.isMaximized().then(setIsMaximized);
      } else {
        const isMax =
          Boolean(document.fullscreenElement) ||
          (window.innerWidth >= window.screen.availWidth - 10 &&
            window.innerHeight >= window.screen.availHeight - 30);
        setIsMaximized(isMax);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sidebar drag resizing
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

  // Editor vs Response splitter drag resizing
  const handleStartEditorResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingEditor(true);
      const container = workbenchContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (workbenchLayout === 'horizontal') {
          const relativeX = moveEvent.clientX - rect.left;
          const ratio = Math.max(0.2, Math.min(0.8, relativeX / rect.width));
          setEditorRatio(ratio);
        } else {
          const relativeY = moveEvent.clientY - rect.top;
          const ratio = Math.max(0.2, Math.min(0.8, relativeY / rect.height));
          setEditorRatio(ratio);
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

  const resetLayout = () => {
    setSidebarWidth(260);
    setEditorRatio(0.5);
  };

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    workbenchLayout,
    setWorkbenchLayout,
    editorRatio,
    setEditorRatio,
    isDraggingSidebar,
    isDraggingEditor,
    isMaximized,
    workbenchContainerRef,
    handleStartSidebarResize,
    handleStartEditorResize,
    resetLayout,
  };
}
