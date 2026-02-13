export const IPC = {
  // Whisper
  WHISPER_TRANSCRIBE: 'whisper:transcribe',
  WHISPER_IS_MODEL_READY: 'whisper:is-model-ready',

  // Model manager
  MODEL_DOWNLOAD: 'model:download',
  MODEL_DOWNLOAD_PROGRESS: 'model:download-progress',
  MODEL_GET_STATUS: 'model:get-status',

  // AI Judge
  AI_JUDGE: 'ai:judge',

  // Store
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_GET_SESSIONS: 'store:get-sessions',
  STORE_SAVE_SESSION: 'store:save-session',
  STORE_DELETE_SESSION: 'store:delete-session',

  // Clipboard
  CLIPBOARD_WRITE: 'clipboard:write',
} as const;
