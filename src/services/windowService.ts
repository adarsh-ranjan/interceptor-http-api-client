export async function getIsWindowMaximized(): Promise<boolean> {
  if (window.interceptor?.isMaximized) {
    return window.interceptor.isMaximized();
  }
  return (
    Boolean(document.fullscreenElement) ||
    (window.innerWidth >= window.screen.availWidth - 10 &&
      window.innerHeight >= window.screen.availHeight - 30)
  );
}

export function subscribeToWindowState(callback: (isMaximized: boolean) => void): () => void {
  let unsubscribeIpc: (() => void) | undefined;
  if (window.interceptor?.onWindowStateChange) {
    unsubscribeIpc = window.interceptor.onWindowStateChange(callback);
  }

  const handleResize = () => {
    getIsWindowMaximized().then(callback);
  };

  window.addEventListener('resize', handleResize);
  return () => {
    unsubscribeIpc?.();
    window.removeEventListener('resize', handleResize);
  };
}

export function openElectronDevTools(): boolean {
  const api = window.interceptor as (Window['interceptor'] & { openDevTools?: () => void }) | undefined;
  if (api?.openDevTools) {
    api.openDevTools();
    return true;
  }
  return false;
}
