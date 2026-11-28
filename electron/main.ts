import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import tls from 'tls';
import { IPC_CHANNELS } from './ipcChannels';
import { MockServerManager } from './mockServerManager';
import { openFileWithDialog, saveFileWithDialog } from './services/fileDialogService';
import { HttpExecutionService } from './services/httpExecutor';

// Trust the OS certificate store (where corporate/proxy root CAs live) in addition to
// Node's bundled Mozilla roots, plus any PEM bundle in NODE_EXTRA_CA_CERTS.
// Certificate validation stays ON - we only extend the trusted CA list.
function configureTrustedCAs() {
  try {
    const cas = new Set<string>(tls.getCACertificates('default'));
    for (const cert of tls.getCACertificates('system')) cas.add(cert);
    for (const cert of tls.getCACertificates('extra')) cas.add(cert);
    tls.setDefaultCACertificates([...cas]);
  } catch (err) {
    console.warn('[Interceptor] Could not load system CA certificates:', err);
  }
}

configureTrustedCAs();

let mainWindow: BrowserWindow | null = null;
const httpExecutor = new HttpExecutionService();
const mockServerManager = new MockServerManager(() => mainWindow);
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
    const isMaximized = mainWindow.isMaximized() || mainWindow.isFullScreen();
    mainWindow.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, { isMaximized });
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

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    return mainWindow.isMaximized() || mainWindow.isFullScreen();
  });

  ipcMain.handle(IPC_CHANNELS.HTTP_EXECUTE, (_event, options) => httpExecutor.execute(options));
  ipcMain.on(IPC_CHANNELS.HTTP_CANCEL, (_event, requestId) => httpExecutor.cancel(requestId));

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, (_event, options) =>
    openFileWithDialog(mainWindow, options)
  );
  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, (_event, options) =>
    saveFileWithDialog(mainWindow, options)
  );

  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_START, (_event, config) =>
    mockServerManager.startServer(config)
  );
  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_STOP, (_event, serverId: string) =>
    mockServerManager.stopServer(serverId)
  );
  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_STOP_ALL, () => mockServerManager.stopAll());
  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_GET_STORE, (_event, serverId: string) =>
    mockServerManager.getServerStore(serverId)
  );
  ipcMain.handle(IPC_CHANNELS.MOCK_SERVER_CLEAR_STORE, (_event, serverId: string) =>
    mockServerManager.clearServerStore(serverId)
  );
  ipcMain.handle(
    IPC_CHANNELS.MOCK_SERVER_SET_STORE,
    (_event, serverId: string, data: Record<string, any>) =>
      mockServerManager.setServerStore(serverId, data)
  );
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../build/icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        app.dock.setIcon(iconPath);
      } catch {
        // Ignore dock setIcon errors in headless environments
      }
    }
  }

  registerIpcHandlers();
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

app.on('before-quit', async () => {
  await mockServerManager.stopAll();
});
