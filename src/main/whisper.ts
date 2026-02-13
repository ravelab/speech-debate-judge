import { getModelPath, isModelDownloaded } from './model-manager';

let whisperAddon: typeof import('@kutalia/whisper-node-addon') | null = null;

async function getWhisper() {
  if (!whisperAddon) {
    whisperAddon = await import('@kutalia/whisper-node-addon');
  }
  return whisperAddon;
}

export async function initWhisper(): Promise<boolean> {
  if (!isModelDownloaded()) return false;
  try {
    await getWhisper();
    return true;
  } catch (err) {
    console.error('Failed to load Whisper addon:', err);
    return false;
  }
}

// Queue to prevent concurrent whisper calls (Metal GPU is not thread-safe)
let transcriptionLock: Promise<string> = Promise.resolve('');

export async function transcribe(pcmFloat32: Float32Array): Promise<string> {
  if (!isModelDownloaded()) throw new Error('Whisper model not ready');

  // Chain onto the previous transcription to serialize GPU access
  const previous = transcriptionLock;
  let resolve: (value: string) => void;
  transcriptionLock = new Promise<string>((r) => { resolve = r; });

  await previous;

  const whisper = await getWhisper();
  try {
    const result = await whisper.transcribe({
      model: getModelPath(),
      pcmf32: pcmFloat32,
      language: 'en',
      no_prints: true,
      no_timestamps: true,
    });
    const segments = result?.transcription ?? [];
    const text = segments.length === 0
      ? ''
      : segments.map((seg: unknown) => {
          // Segments are [start_time, end_time, text] arrays
          if (Array.isArray(seg)) return seg[2] || '';
          if (typeof seg === 'object' && seg && 'text' in seg) return (seg as { text: string }).text;
          return String(seg);
        })
        .join(' ')
        .replace(/\[BLANK_AUDIO\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    resolve!(text);
    return text;
  } catch (err) {
    resolve!('');
    console.error('Transcription error:', err);
    throw err;
  }
}

export function isReady(): boolean {
  return isModelDownloaded();
}
