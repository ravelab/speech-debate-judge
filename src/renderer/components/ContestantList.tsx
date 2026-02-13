import React, { useState, useMemo } from 'react';
import type { Contestant } from '../lib/types';
import { ContestantRow } from './ContestantRow';

type SortMode = 'order' | 'rank';

interface ContestantListProps {
  contestants: Contestant[];
  onContestantUpdated?: (updated: Contestant) => void;
}

export function ContestantList({ contestants, onContestantUpdated }: ContestantListProps) {
  const [sortMode, setSortMode] = useState<SortMode>('rank');

  const sorted = useMemo(() => {
    const copy = [...contestants];
    if (sortMode === 'rank') {
      copy.sort((a, b) => b.score - a.score);
    } else {
      copy.sort((a, b) => a.order - b.order);
    }
    return copy;
  }, [contestants, sortMode]);

  const ranks = useMemo(() => {
    const byScore = [...contestants].sort((a, b) => b.score - a.score);
    const rankMap = new Map<string, number>();
    for (let i = 0; i < byScore.length; i++) {
      rankMap.set(byScore[i].id, i + 1);
    }
    return rankMap;
  }, [contestants]);

  if (contestants.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">
          Contestants ({contestants.length})
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setSortMode('order')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              sortMode === 'order'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Order
          </button>
          <button
            onClick={() => setSortMode('rank')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              sortMode === 'rank'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Rank
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-gray-500 border-b border-gray-700/50">
        <span className="w-6 text-right shrink-0">#</span>
        <span className="flex-1 min-w-0">Name</span>
        <span className="w-16 text-right shrink-0">Time</span>
        <span className="w-16 text-right shrink-0">Score</span>
        <span className="shrink-0 w-10"></span>
        <span className="w-3 shrink-0"></span>
      </div>

      {sorted.map((c) => (
        <ContestantRow
          key={c.id}
          contestant={c}
          displayIndex={sortMode === 'rank' ? (ranks.get(c.id) ?? 0) : c.order}
          onUpdated={onContestantUpdated}
        />
      ))}
    </div>
  );
}
