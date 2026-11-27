import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const activeRequests = new Map<string, AbortController>();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1a1a1a',
    title: 'Interceptor',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 12 },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const sendWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isMax = mainWindow.isMaximized() || mainWindow.isFullScreen();
    mainWindow.webContents.send('window:state-changed', { isMaximized: isMax });
  };

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);
  mainWindow.on('resize', sendWindowState);

  if (isDev) {
    const loadDevServer = () => {
      mainWindow?.loadURL('http://localhost:5173').catch(() => {
        setTimeout(loadDevServer, 300);
      });
    };
    loadDevServer();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../build/icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        app.dock.setIcon(iconPath);
      } catch (e) {
        // Ignore dock setIcon errors in headless environments
      }
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Window State
ipcMain.handle('window:isMaximized', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return mainWindow.isMaximized() || mainWindow.isFullScreen();
});

// IPC: HTTP Request Execution with Rich Payload Support
ipcMain.handle('http:execute', async (_event, options) => {
  const {
    id = Math.random().toString(36).substring(2),
    method,
    url,
    headers = {},
    bodyType = 'none',
    body,
    formData,
    urlEncoded,
    binaryFilePath,
    timeout = 30000,
  } = options;

  const controller = new AbortController();
  activeRequests.set(id, controller);

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeout}ms`));
  }, timeout);

  const startTime = performance.now();

  try {
    // Validate and parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    const fetchHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (key && value !== undefined && value !== null) {
        fetchHeaders.append(key, String(value));
      }
    }

    const requestInit: RequestInit = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      signal: controller.signal,
      redirect: 'follow',
    };

    const isBodyAllowed = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

    if (isBodyAllowed) {
      if (bodyType === 'form-data' && Array.isArray(formData)) {
        const nativeFormData = new FormData();
        for (const item of formData) {
          if (!item.enabled || !item.key) continue;
          if (item.type === 'file' && item.filePath) {
            try {
              const fileBuffer = await fs.promises.readFile(item.filePath);
              const fileName = item.fileName || path.basename(item.filePath);
              nativeFormData.append(item.key, new Blob([fileBuffer]), fileName);
            } catch (err: any) {
              throw new Error(`Failed to read file for form-data: ${err.message}`);
            }
          } else {
            nativeFormData.append(item.key, item.value || '');
          }
        }
        // Do not set Content-Type header so fetch handles boundary
        requestInit.body = nativeFormData as any;
        fetchHeaders.delete('content-type');
      } else if (bodyType === 'urlencoded' && Array.isArray(urlEncoded)) {
        const searchParams = new URLSearchParams();
        for (const item of urlEncoded) {
          if (item.enabled && item.key) {
            searchParams.append(item.key, item.value || '');
          }
        }
        requestInit.body = searchParams.toString();
        if (!fetchHeaders.has('content-type')) {
          fetchHeaders.set('content-type', 'application/x-www-form-urlencoded');
        }
      } else if (bodyType === 'binary' && binaryFilePath) {
        try {
          const binaryBuffer = await fs.promises.readFile(binaryFilePath);
          requestInit.body = binaryBuffer;
          if (!fetchHeaders.has('content-type')) {
            fetchHeaders.set('content-type', 'application/octet-stream');
          }
        } catch (err: any) {
          throw new Error(`Failed to read binary file: ${err.message}`);
        }
      } else if (body) {
        // Standard JSON or Raw Text
        requestInit.body = body;
      }
    }

    const response = await fetch(parsedUrl.toString(), requestInit);
    clearTimeout(timeoutId);
    activeRequests.delete(id);

    const endTime = performance.now();
    const timeMs = Math.round(endTime - startTime);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const sizeBytes = arrayBuffer.byteLength;
    const textDecoder = new TextDecoder('utf-8');
    const rawBody = textDecoder.decode(arrayBuffer);

    let parsedData = null;
    let isJson = false;

    if (contentType.includes('application/json') || rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
      try {
        parsedData = JSON.parse(rawBody);
        isJson = true;
      } catch {
        parsedData = rawBody;
        isJson = false;
      }
    } else {
      parsedData = rawBody;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: parsedData,
      rawBody,
      contentType,
      isJson,
      timeMs,
      sizeBytes,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    activeRequests.delete(id);
    const endTime = performance.now();

    return {
      status: 0,
      statusText: error.name === 'AbortError' ? 'Aborted' : 'Error',
      headers: {},
      data: null,
      rawBody: error.message || 'Unknown network error',
      contentType: 'text/plain',
      isJson: false,
      timeMs: Math.round(endTime - startTime),
      sizeBytes: 0,
      error: error.message || 'Request failed',
    };
  }
});

// IPC: HTTP Request Cancellation
ipcMain.on('http:cancel', (_event, requestId) => {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort(new Error('Request cancelled by user'));
    activeRequests.delete(requestId);
  }
});

// IPC: File Dialogs
ipcMain.handle('dialog:openFile', async (_event, options = {}) => {
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

  let content: string | undefined = undefined;
  if (options.readContent !== false) {
    try {
      content = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      // ignore read if binary
    }
  }

  return { canceled: false, filePath, fileName, content };
});

ipcMain.handle('dialog:saveFile', async (_event, options) => {
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
});
