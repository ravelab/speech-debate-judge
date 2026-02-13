import React, { useEffect, useState } from 'react';
import type { JudgingSession } from '../lib/types';
import { ContestantList } from './ContestantList';

interface HistoryViewProps {
  onClose: () => void;
  onLoadSession: (session: JudgingSession) => void;
}

function getSessionLabel(session: JudgingSession): string {
  if (session.events && session.events.length > 0) {
    const names = session.events.map(e => e.eventName).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Untitled';
  }
  return session.eventName || 'Untitled';
}

function getContestantCount(session: JudgingSession): number {
  if (session.events && session.events.length > 0) {
    return session.events.reduce((sum, e) => sum + e.contestants.length, 0);
  }
  return session.contestants?.length || 0;
}

export function HistoryView({ onClose, onLoadSession }: HistoryViewProps) {
  const [sessions, setSessions] = useState<JudgingSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.storeGetSessions().then(setSessions);
  }, []);

  const deleteSession = async (id: string) => {
    await window.electronAPI.storeDeleteSession(id);
    setSessions((s) => s.filter((sess) => sess.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Past Sessions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sessions.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No past sessions</p>
          )}

          {sessions
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((session) => (
              <div
                key={session.id}
                className="bg-gray-800 rounded-lg border border-gray-700"
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-750"
                  onClick={() =>
                    setExpanded(expanded === session.id ? null : session.id)
                  }
                >
                  <div>
                    <span className="text-white text-sm font-medium">
                      {getSessionLabel(session)}
                    </span>
                    <span className="text-gray-500 text-xs ml-3">
                      {new Date(session.createdAt).toLocaleDateString()} —{' '}
                      {getContestantCount(session)} contestants
                      {session.events && session.events.length > 1
                        ? `, ${session.events.length} events`
                        : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadSession(session);
                      }}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                    >
                      Load
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expanded === session.id && session.events && (
                  <div className="px-4 pb-3 space-y-2">
                    {session.events.map((evt, i) => (
                      <div key={evt.id}>
                        {session.events!.length > 1 && (
                          <p className="text-xs text-gray-500 mb-1">
                            {evt.eventName || `Event ${i + 1}`}
                          </p>
                        )}
                        <ContestantList contestants={evt.contestants} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
