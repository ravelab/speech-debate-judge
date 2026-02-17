export interface Contestant {
  id: string;
  name: string;
  order: number;
  score: number;
  feedback: string;
  transcript: string;
  timestamp: number;
  duration: number;
}

export interface EventGroup {
  id: string;
  eventName: string;
  idealTime: number; // seconds, 0 = no limit
  contestants: Contestant[];
  createdAt: number;
}

export type AIProvider = 'anthropic' | 'gemini' | 'openrouter';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface JudgingSession {
  id: string;
  events: EventGroup[];
  createdAt: number;
  updatedAt: number;
  // Legacy compat
  rounds?: EventGroup[];
  eventName?: string;
  contestants?: Contestant[];
}

export interface JudgeResult {
  score: number;
  feedback: string;
}

export interface ModelStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  modelPath: string | null;
}

export interface ElectronAPI {
  whisperTranscribe: (audioData: Float32Array) => Promise<string>;
  whisperIsModelReady: () => Promise<boolean>;
  modelDownload: () => Promise<void>;
  modelGetStatus: () => Promise<ModelStatus>;
  onModelDownloadProgress: (callback: (progress: number) => void) => () => void;
  aiJudge: (config: ProviderConfig, eventName: string, transcript: string, durationSeconds: number, idealTimeSeconds: number, existingScores: Array<{name: string, score: number}>) => Promise<JudgeResult>;
  storeGet: (key: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown) => Promise<void>;
  storeGetSessions: () => Promise<JudgingSession[]>;
  storeSaveSession: (session: JudgingSession) => Promise<void>;
  storeDeleteSession: (id: string) => Promise<void>;
  clipboardWrite: (text: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
