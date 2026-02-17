import React, { useState } from 'react';
import type { Contestant } from '../lib/types';

interface ContestantRowProps {
  contestant: Contestant;
  displayIndex: number;
  onUpdated?: (updated: Contestant) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseDuration(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const [mStr, sStr] = trimmed.split(':');
    return (parseInt(mStr) || 0) * 60 + (parseInt(sStr) || 0);
  }
  return (parseInt(trimmed) || 0) * 60;
}

export function ContestantRow({ contestant, displayIndex, onUpdated }: ContestantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(contestant.name);
  const [editScore, setEditScore] = useState(String(contestant.score));
  const [editTime, setEditTime] = useState(formatDuration(contestant.duration));

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(contestant.name);
    setEditScore(String(contestant.score));
    setEditTime(formatDuration(contestant.duration));
    setEditing(true);
  };

  const saveEdits = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdated) return;
    const newScore = Math.min(30, Math.max(20, Math.round(parseFloat(editScore) || contestant.score)));
    const newDuration = parseDuration(editTime);
    const newName = editName.trim() || contestant.name;
    onUpdated({ ...contestant, name: newName, score: newScore, duration: newDuration });
    setEditing(false);
  };

  const cancelEdits = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  const scoreColor =
    contestant.score >= 27
      ? 'text-green-400'
      : contestant.score >= 24
        ? 'text-yellow-400'
        : 'text-red-400';

  if (editing) {
    return (
      <div className="border-b border-gray-700 last:border-b-0">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/80">
          <span className="text-gray-500 text-sm w-6 text-right shrink-0">{displayIndex}</span>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-0 bg-gray-700 border border-gray-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            placeholder="m:ss"
            className="w-16 shrink-0 bg-gray-700 border border-gray-500 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            min={20}
            max={30}
            step={1}
            value={editScore}
            onChange={(e) => setEditScore(e.target.value)}
            className="w-16 shrink-0 bg-gray-700 border border-gray-500 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-1 shrink-0">
            <button onClick={saveEdits} className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors">
              Save
            </button>
            <button onClick={cancelEdits} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <div
        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-500 text-sm w-6 text-right shrink-0">{displayIndex}</span>
        <span className="text-gray-200 flex-1 text-sm min-w-0 truncate">{contestant.name}</span>
        <span className="text-gray-500 text-xs w-16 text-right shrink-0">
          {formatDuration(contestant.duration)}
        </span>
        <span className={`font-bold text-sm w-16 text-right shrink-0 ${scoreColor}`}>
          {contestant.score}
        </span>
        {onUpdated && (
          <button
            onClick={startEditing}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors shrink-0"
          >
            Edit
          </button>
        )}
        <span className="text-gray-500 text-xs w-3 shrink-0">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div className="px-12 pb-3 space-y-2">
          <div className="text-gray-400 text-xs leading-relaxed whitespace-pre-line">{contestant.feedback}</div>
          {contestant.transcript && (
            <details className="text-xs">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                Show transcript
              </summary>
              <p className="text-gray-500 leading-relaxed mt-1 whitespace-pre-wrap">
                {contestant.transcript}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
