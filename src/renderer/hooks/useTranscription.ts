import { useState, useCallback } from 'react';

interface TranscriptionResult {
  transcript: string;
  isTranscribing: boolean;
  error: string | null;
  transcribeChunk: (pcmData: Float32Array) => Promise<void>;
  transcribeAll: (pcmData: Float32Array) => Promise<string>;
  clearTranscript: () => void;
}

export function useTranscription(): TranscriptionResult {
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribeChunk = useCallback(async (pcmData: Float32Array) => {
    try {
      setIsTranscribing(true);
      const text = await window.electronAPI.whisperTranscribe(pcmData);
      if (text.trim()) {
        setTranscript((prev) => (prev ? prev + ' ' + text.trim() : text.trim()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const transcribeAll = useCallback(async (pcmData: Float32Array): Promise<string> => {
    try {
      setIsTranscribing(true);
      setError(null);
      const text = await window.electronAPI.whisperTranscribe(pcmData);
      const fullTranscript = transcript
        ? transcript + ' ' + text.trim()
        : text.trim();
      setTranscript(fullTranscript);
      return fullTranscript;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setError(msg);
      return transcript;
    } finally {
      setIsTranscribing(false);
    }
  }, [transcript]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { transcript, isTranscribing, error, transcribeChunk, transcribeAll, clearTranscript };
}
