import { app, BrowserWindow, ipcMain, clipboard } from 'electron';
import * as path from 'node:path';
import { IPC } from '../shared/ipc-channels';
import { transcribe, isReady, initWhisper } from './whisper';
import { judgeTranscript } from './ai-judge';
import { downloadModel, getModelStatus } from './model-manager';
import {
  getStoreValue,
  setStoreValue,
  getSessions,
  saveSession,
  deleteSession,
  getWindowBounds,
  setWindowBounds,
} from './store';
import type { ProviderConfig } from '../renderer/lib/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  const saved = getWindowBounds();

  mainWindow = new BrowserWindow({
    minWidth: 480,
    minHeight: 600,
    ...(saved ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : { width: 900, height: 700 }),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (saved?.isMaximized) {
    mainWindow.maximize();
  }

  // Save window bounds on move/resize
  const saveBounds = () => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      setWindowBounds({ ...bounds, isMaximized: false });
    }
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('maximize', () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    setWindowBounds({ ...bounds, isMaximized: true });
  });
  mainWindow.on('unmaximize', saveBounds);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

// --- IPC Handlers ---

ipcMain.handle(IPC.WHISPER_TRANSCRIBE, async (_event, audioData: number[]) => {
  const pcm = new Float32Array(audioData);
  return transcribe(pcm);
});

ipcMain.handle(IPC.WHISPER_IS_MODEL_READY, async () => {
  if (!isReady()) {
    await initWhisper();
  }
  return isReady();
});

ipcMain.handle(IPC.MODEL_DOWNLOAD, async () => {
  await downloadModel((progress) => {
    mainWindow?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, progress);
  });
  await initWhisper();
});

ipcMain.handle(IPC.MODEL_GET_STATUS, async () => {
  return getModelStatus();
});

ipcMain.handle(
  IPC.AI_JUDGE,
  async (_event, config: ProviderConfig, eventName: string, transcript: string, durationSeconds: number, idealTimeSeconds: number, existingScores: Array<{name: string, score: number}>) => {
    return judgeTranscript(config, eventName, transcript, durationSeconds, idealTimeSeconds, existingScores);
  }
);

ipcMain.handle(IPC.STORE_GET, async (_event, key: string) => {
  return getStoreValue(key);
});

ipcMain.handle(IPC.STORE_SET, async (_event, key: string, value: unknown) => {
  setStoreValue(key, value);
});

ipcMain.handle(IPC.STORE_GET_SESSIONS, async () => {
  return getSessions();
});

ipcMain.handle(IPC.STORE_SAVE_SESSION, async (_event, session) => {
  saveSession(session);
});

ipcMain.handle(IPC.STORE_DELETE_SESSION, async (_event, id: string) => {
  deleteSession(id);
});

ipcMain.handle(IPC.CLIPBOARD_WRITE, async (_event, text: string) => {
  clipboard.writeText(text);
});

// --- App Lifecycle ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
