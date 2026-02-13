import React, { useEffect, useState } from 'react';
import type { ModelStatus } from '../lib/types';

export function ModelDownloader() {
  const [status, setStatus] = useState<ModelStatus>({
    downloaded: false,
    downloading: false,
    progress: 0,
    modelPath: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.modelGetStatus().then(setStatus);
    const unsub = window.electronAPI.onModelDownloadProgress((progress) => {
      setStatus((s) => ({ ...s, downloading: true, progress }));
    });
    return unsub;
  }, []);

  const handleDownload = async () => {
    try {
      setError(null);
      setStatus((s) => ({ ...s, downloading: true, progress: 0 }));
      await window.electronAPI.modelDownload();
      const newStatus = await window.electronAPI.modelGetStatus();
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      setStatus((s) => ({ ...s, downloading: false }));
    }
  };

  if (status.downloaded) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <span>Whisper model ready</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Whisper Model (ggml-small.en, 488MB)</span>
        {!status.downloading && (
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
          >
            Download
          </button>
        )}
      </div>

      {status.downloading && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      {status.downloading && (
        <p className="text-xs text-gray-500">{status.progress}% downloaded...</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
