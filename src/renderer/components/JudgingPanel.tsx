import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useTranscription } from '../hooks/useTranscription';
import { FeedbackCard } from './FeedbackCard';
import type { Contestant, JudgeResult, ProviderConfig } from '../lib/types';

interface JudgingPanelProps {
  eventName: string;
  idealTime: number;
  onContestantJudged: (contestant: Contestant) => void;
  contestantCount: number;
}

export function JudgingPanel({
  eventName,
  idealTime,
  onContestantJudged,
  contestantCount,
}: JudgingPanelProps) {
  const [studentName, setStudentName] = useState('');
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const {
    transcript,
    isTranscribing,
    error: transcriptError,
    transcribeChunk,
    transcribeAll,
    clearTranscript,
  } = useTranscription();

  const onChunk = useCallback(
    (pcmData: Float32Array) => {
      transcribeChunk(pcmData);
    },
    [transcribeChunk]
  );

  const { isRecording, startRecording, stopRecording, error: audioError } =
    useAudioCapture(onChunk);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleStart = async () => {
    setJudgeResult(null);
    setJudgeError(null);

    if (!eventName.trim()) {
      setJudgeError('Please enter an event name before recording.');
      return;
    }

    const modelReady = await window.electronAPI.whisperIsModelReady();
    if (!modelReady) {
      setJudgeError('Whisper speech model not downloaded. Go to Settings and download the Whisper model first.');
      return;
    }

    const config = await window.electronAPI.storeGet('providerConfig') as ProviderConfig | null;
    if (!config || !config.apiKey) {
      setJudgeError('No API key configured. Go to Settings, select your AI provider, enter your API key, and click Save.');
      return;
    }

    clearTranscript();
    setElapsed(0);
    elapsedRef.current = 0;
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const val = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(val);
      elapsedRef.current = val;
    }, 1000);
    await startRecording();
  };

  const handleStop = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const finalDuration = elapsedRef.current;
    const remainingAudio = stopRecording();

    let finalTranscript = transcript;
    if (remainingAudio.length > 0) {
      finalTranscript = await transcribeAll(remainingAudio);
    }

    if (!finalTranscript.trim()) {
      setJudgeError('No speech detected. Try speaking louder or check your microphone.');
      return;
    }

    setIsJudging(true);
    try {
      const config = await window.electronAPI.storeGet('providerConfig') as ProviderConfig | null;
      if (!config || !config.apiKey) {
        throw new Error('API key not configured. Please set your API key in Settings.');
      }
      const result = await window.electronAPI.aiJudge(config, eventName, finalTranscript, finalDuration, idealTime);
      setJudgeResult(result);

      const contestant: Contestant = {
        id: crypto.randomUUID(),
        name: studentName || `Contestant ${contestantCount + 1}`,
        order: contestantCount + 1,
        score: result.score,
        feedback: result.feedback,
        transcript: finalTranscript,
        timestamp: Date.now(),
        duration: finalDuration,
      };

      onContestantJudged(contestant);
      setStudentName('');
    } catch (err) {
      setJudgeError(err instanceof Error ? err.message : 'Judging failed');
    } finally {
      setIsJudging(false);
    }
  };

  const error = audioError || transcriptError || judgeError;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400 whitespace-nowrap shrink-0">Student:</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter name..."
          disabled={isRecording}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        {!isRecording ? (
          <button
            onClick={handleStart}
            disabled={isJudging}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-white" />
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-sm bg-white" />
            Stop
          </button>
        )}

      </div>

      {(isRecording || isTranscribing || isJudging) && (
        <div className="flex gap-3 flex-wrap">
          {isRecording && (
            <span className="flex items-center gap-2 text-red-400 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording... {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
              {idealTime > 0 && (
                <span className="text-gray-500 ml-1">
                  / {Math.floor(idealTime / 60)}:{(idealTime % 60).toString().padStart(2, '0')}
                </span>
              )}
            </span>
          )}
          {isTranscribing && (
            <span className="text-blue-400 text-sm">Transcribing...</span>
          )}
          {isJudging && (
            <span className="text-purple-400 text-sm">Generating feedback...</span>
          )}
        </div>
      )}

      {(transcript || isRecording) && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Live Transcript
          </h3>
          <p className="text-gray-200 text-sm leading-relaxed min-h-[3rem]">
            {transcript || (
              <span className="text-gray-500 italic">Listening...</span>
            )}
          </p>
        </div>
      )}

      {judgeResult && (
        <FeedbackCard score={judgeResult.score} feedback={judgeResult.feedback} />
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
