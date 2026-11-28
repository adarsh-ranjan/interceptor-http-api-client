export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileOptions {
  defaultPath: string;
  content: string;
  filters?: FileFilter[];
  mimeType?: string;
}

/**
 * Saves text content using Electron's native save dialog or a browser download fallback.
 */
export async function saveTextFile({
  defaultPath,
  content,
  filters,
  mimeType = 'application/json',
}: SaveFileOptions): Promise<boolean> {
  if (window.interceptor?.saveFileDialog) {
    return window.interceptor.saveFileDialog({
      defaultPath,
      content,
      filters,
    });
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultPath;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Opens a text/JSON file using Electron's file dialog or a browser file input fallback.
 */
export async function openTextFile(options?: {
  accept?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  if (window.interceptor?.openFileDialog) {
    const res = await window.interceptor.openFileDialog({
      filters: options?.filters,
    });
    if (res.canceled || !res.content) return null;
    return res.content;
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.accept) input.accept = options.accept;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await file.text());
      } catch (err) {
        reject(err);
      }
    };

    input.click();
  });
}

/**
 * Selects a binary/arbitrary file path using Electron's dialog or browser file input fallback.
 */
export async function pickBinaryFile(): Promise<{ filePath: string; fileName: string } | null> {
  if (window.interceptor?.openFileDialog) {
    const res = await window.interceptor.openFileDialog();
    if (res?.filePath) {
      return {
        filePath: res.filePath,
        fileName: res.fileName || res.filePath,
      };
    }
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        resolve({
          filePath: (file as any).path || file.name,
          fileName: file.name,
        });
      } else {
        resolve(null);
      }
    };
    input.click();
  });
}
