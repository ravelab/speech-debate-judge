import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';

contextBridge.exposeInMainWorld('electronAPI', {
  whisperTranscribe: (audioData: Float32Array) =>
    ipcRenderer.invoke(IPC.WHISPER_TRANSCRIBE, Array.from(audioData)),

  whisperIsModelReady: () =>
    ipcRenderer.invoke(IPC.WHISPER_IS_MODEL_READY),

  modelDownload: () =>
    ipcRenderer.invoke(IPC.MODEL_DOWNLOAD),

  modelGetStatus: () =>
    ipcRenderer.invoke(IPC.MODEL_GET_STATUS),

  onModelDownloadProgress: (callback: (progress: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: number) => {
      callback(progress);
    };
    ipcRenderer.on(IPC.MODEL_DOWNLOAD_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IPC.MODEL_DOWNLOAD_PROGRESS, listener);
    };
  },

  aiJudge: (config: unknown, eventName: string, transcript: string, durationSeconds: number, idealTimeSeconds: number) =>
    ipcRenderer.invoke(IPC.AI_JUDGE, config, eventName, transcript, durationSeconds, idealTimeSeconds),

  storeGet: (key: string) =>
    ipcRenderer.invoke(IPC.STORE_GET, key),

  storeSet: (key: string, value: unknown) =>
    ipcRenderer.invoke(IPC.STORE_SET, key, value),

  storeGetSessions: () =>
    ipcRenderer.invoke(IPC.STORE_GET_SESSIONS),

  storeSaveSession: (session: unknown) =>
    ipcRenderer.invoke(IPC.STORE_SAVE_SESSION, session),

  storeDeleteSession: (id: string) =>
    ipcRenderer.invoke(IPC.STORE_DELETE_SESSION, id),

  clipboardWrite: (text: string) =>
    ipcRenderer.invoke(IPC.CLIPBOARD_WRITE, text),
});
