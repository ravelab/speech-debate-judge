import Store from 'electron-store';

interface ProviderConfig {
  provider: 'anthropic' | 'gemini' | 'openrouter';
  apiKey: string;
  model: string;
}

interface ApiKeys {
  anthropic: string;
  gemini: string;
  openrouter: string;
}

interface ContestantSchema {
  id: string;
  name: string;
  order: number;
  score: number;
  feedback: string;
  transcript: string;
  timestamp: number;
  duration: number;
}

interface EventSchema {
  id: string;
  eventName: string;
  idealTime: number;
  contestants: ContestantSchema[];
  createdAt: number;
}

interface SessionSchema {
  id: string;
  events: EventSchema[];
  createdAt: number;
  updatedAt: number;
  // Legacy fields for migration
  rounds?: EventSchema[];
  eventName?: string;
  contestants?: Array<ContestantSchema & { duration?: number }>;
}

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface StoreSchema {
  apiKey: string;
  apiKeys: ApiKeys;
  providerConfig: ProviderConfig;
  whisperModel: string;
  sessions: SessionSchema[];
  windowBounds: WindowBounds | null;
}

const store = new Store<StoreSchema>({
  defaults: {
    apiKey: '',
    apiKeys: {
      anthropic: '',
      gemini: '',
      openrouter: '',
    },
    providerConfig: {
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-sonnet-4-5-20250929',
    },
    whisperModel: 'ggml-small.en.bin',
    sessions: [],
    windowBounds: null,
  },
  encryptionKey: 'speech-debate-judge-v1',
});

// Migrate legacy apiKey into apiKeys.anthropic if needed
function migrateApiKey() {
  const legacyKey = store.get('apiKey');
  const keys = store.get('apiKeys');
  if (legacyKey && !keys.anthropic) {
    store.set('apiKeys', { ...keys, anthropic: legacyKey });
  }
  const oldConfig = store.get('providerConfig');
  if (oldConfig?.apiKey) {
    const currentKeys = store.get('apiKeys');
    if (!currentKeys[oldConfig.provider]) {
      store.set('apiKeys', { ...currentKeys, [oldConfig.provider]: oldConfig.apiKey });
    }
  }
}

function ensureEventShape(evt: Record<string, unknown>): EventSchema {
  return {
    id: (evt.id as string) || crypto.randomUUID(),
    eventName: (evt.eventName as string) || 'Unknown Event',
    idealTime: (evt.idealTime as number) ?? 0,
    contestants: ((evt.contestants as ContestantSchema[]) || []).map(c => ({
      ...c,
      duration: c.duration ?? 0,
    })),
    createdAt: (evt.createdAt as number) || Date.now(),
  };
}

// Migrate legacy sessions to events-based format
function migrateSession(session: SessionSchema): SessionSchema {
  // Already has events array
  if (session.events && session.events.length > 0) {
    return { ...session, events: session.events.map(e => ensureEventShape(e as unknown as Record<string, unknown>)) };
  }
  // Has rounds array (previous format)
  if (session.rounds && session.rounds.length > 0) {
    return {
      id: session.id,
      events: session.rounds.map(r => ensureEventShape(r as unknown as Record<string, unknown>)),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
  // Legacy flat format
  if (session.contestants && session.contestants.length > 0) {
    return {
      id: session.id,
      events: [{
        id: crypto.randomUUID(),
        eventName: session.eventName || 'Unknown Event',
        idealTime: 0,
        contestants: session.contestants.map(c => ({ ...c, duration: c.duration ?? 0 })),
        createdAt: session.createdAt,
      }],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
  return { ...session, events: session.events || [] };
}

migrateApiKey();

export function getStoreValue(key: string): unknown {
  return store.get(key);
}

export function setStoreValue(key: string, value: unknown): void {
  store.set(key, value);
}

export function getSessions(): SessionSchema[] {
  const sessions = store.get('sessions') || [];
  return sessions.map(migrateSession);
}

export function saveSession(session: SessionSchema): void {
  const sessions = getSessions();
  const migrated = migrateSession(session);
  const idx = sessions.findIndex((s) => s.id === migrated.id);
  if (idx >= 0) {
    sessions[idx] = migrated;
  } else {
    sessions.push(migrated);
  }
  store.set('sessions', sessions);
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  store.set('sessions', sessions);
}

export function getProviderConfig(): ProviderConfig {
  return store.get('providerConfig');
}

export function getWindowBounds(): WindowBounds | null {
  return store.get('windowBounds');
}

export function setWindowBounds(bounds: WindowBounds): void {
  store.set('windowBounds', bounds);
}

export default store;
