import { BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

export interface OpenFileDialogOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  readContent?: boolean;
}

export interface SaveFileDialogOptions {
  defaultPath?: string;
  content: string;
  filters?: { name: string; extensions: string[] }[];
}

export async function openFileWithDialog(
  mainWindow: BrowserWindow | null,
  options: OpenFileDialogOptions = {}
) {
  if (!mainWindow) return { canceled: true };

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select File',
    properties: ['openFile'],
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const fileName = path.basename(filePath);
  let content: string | undefined;

  if (options.readContent !== false) {
    try {
      content = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      // Ignore read errors for binary files
    }
  }

  return { canceled: false, filePath, fileName, content };
}

export async function saveFileWithDialog(
  mainWindow: BrowserWindow | null,
  options: SaveFileDialogOptions
): Promise<boolean> {
  if (!mainWindow) return false;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || 'collection.json',
    filters: options.filters || [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (canceled || !filePath) {
    return false;
  }

  await fs.promises.writeFile(filePath, options.content, 'utf-8');
  return true;
}
