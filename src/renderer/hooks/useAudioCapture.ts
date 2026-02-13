import { useState, useRef, useCallback } from 'react';

interface AudioCaptureResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Float32Array;
  error: string | null;
}

export function useAudioCapture(
  onChunk: (pcmData: Float32Array) => void
): AudioCaptureResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const allChunksRef = useRef<Float32Array[]>([]);
  const sentChunksRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      allChunksRef.current = [];
      sentChunksRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });
      contextRef.current = audioContext;

      // Use ScriptProcessor as a simpler fallback (AudioWorklet requires serving the file)
      const source = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      const CHUNK_SECONDS = 5;
      const samplesPerChunk = 16000 * CHUNK_SECONDS;

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(data);
        allChunksRef.current.push(copy);

        // Check if we have enough for a chunk
        let pendingLen = 0;
        for (let i = sentChunksRef.current; i < allChunksRef.current.length; i++) {
          pendingLen += allChunksRef.current[i].length;
        }

        if (pendingLen >= samplesPerChunk) {
          const pending: Float32Array[] = [];
          for (let i = sentChunksRef.current; i < allChunksRef.current.length; i++) {
            pending.push(allChunksRef.current[i]);
          }
          const merged = new Float32Array(pendingLen);
          let offset = 0;
          for (const chunk of pending) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          sentChunksRef.current = allChunksRef.current.length;
          onChunk(merged);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Store processor ref for cleanup
      workletRef.current = processor as unknown as AudioWorkletNode;

      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to access microphone'
      );
    }
  }, [onChunk]);

  const stopRecording = useCallback((): Float32Array => {
    // Only collect unsent audio (remainder after the last chunk sent via onChunk)
    const remaining: Float32Array[] = [];
    let totalLen = 0;
    for (let i = sentChunksRef.current; i < allChunksRef.current.length; i++) {
      remaining.push(allChunksRef.current[i]);
      totalLen += allChunksRef.current[i].length;
    }
    const remainingAudio = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of remaining) {
      remainingAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Cleanup
    if (workletRef.current) {
      (workletRef.current as unknown as ScriptProcessorNode).disconnect();
      workletRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }

    allChunksRef.current = [];
    sentChunksRef.current = 0;
    setIsRecording(false);

    return remainingAudio;
  }, []);

  return { isRecording, startRecording, stopRecording, error };
}
