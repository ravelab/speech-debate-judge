import React, { useState, useEffect, useCallback } from 'react';
import { JudgingPanel } from './components/JudgingPanel';
import { ContestantList } from './components/ContestantList';
import { ExportButton } from './components/ExportButton';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryView } from './components/HistoryView';
import type { Contestant, JudgingSession, EventGroup } from './lib/types';
import { EVENT_PRESETS } from './lib/prompts';

function createEvent(eventName: string): EventGroup {
  return {
    id: crypto.randomUUID(),
    eventName,
    idealTime: 0,
    contestants: [],
    createdAt: Date.now(),
  };
}

function formatIdealTime(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${m}:00`;
}

function parseIdealTime(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const [mStr, sStr] = trimmed.split(':');
    return (parseInt(mStr) || 0) * 60 + (parseInt(sStr) || 0);
  }
  return (parseInt(trimmed) || 0) * 60;
}

export default function App() {
  const [events, setEvents] = useState<EventGroup[]>(() => [createEvent('')]);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [idealTimeInput, setIdealTimeInput] = useState('');

  const activeEvent = events[activeEventIndex];

  // Sync ideal time input when switching events
  useEffect(() => {
    setIdealTimeInput(activeEvent?.idealTime ? formatIdealTime(activeEvent.idealTime) : '');
  }, [activeEventIndex]);

  // Persist session whenever events change
  useEffect(() => {
    const hasContestants = events.some(e => e.contestants.length > 0);
    const hasEventName = events.some(e => e.eventName);
    if (hasContestants && hasEventName) {
      const session: JudgingSession = {
        id: sessionId,
        events,
        createdAt: events[0]?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      window.electronAPI.storeSaveSession(session);
    }
  }, [events, sessionId]);

  const setActiveEventName = useCallback((name: string) => {
    setEvents(prev => prev.map((e, i) =>
      i === activeEventIndex ? { ...e, eventName: name } : e
    ));
  }, [activeEventIndex]);

  const handleIdealTimeBlur = useCallback(() => {
    const seconds = parseIdealTime(idealTimeInput);
    setEvents(prev => prev.map((e, i) =>
      i === activeEventIndex ? { ...e, idealTime: seconds } : e
    ));
    setIdealTimeInput(seconds ? formatIdealTime(seconds) : '');
  }, [activeEventIndex, idealTimeInput]);

  const handleContestantJudged = useCallback((contestant: Contestant) => {
    setEvents(prev => prev.map((e, i) => {
      if (i !== activeEventIndex) return e;
      const allContestants = [...e.contestants.map(c => ({ ...c })), { ...contestant }];
      // Sort by score ascending; new contestant sorts first among ties (keeps their score)
      const sorted = allContestants.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.id === contestant.id ? -1 : b.id === contestant.id ? 1 : 0;
      });
      // Push duplicates upward so no two contestants share a score
      for (let j = 1; j < sorted.length; j++) {
        if (sorted[j].score <= sorted[j - 1].score) {
          sorted[j].score = Math.min(30, sorted[j - 1].score + 1);
        }
      }
      // Apply adjusted scores back, preserving original order
      const scoreMap = new Map(sorted.map(c => [c.id, c.score]));
      const adjusted = e.contestants.map(c => ({ ...c, score: scoreMap.get(c.id) ?? c.score }));
      return { ...e, contestants: [...adjusted, { ...contestant, score: scoreMap.get(contestant.id) ?? contestant.score }] };
    }));
  }, [activeEventIndex]);

  const handleContestantUpdated = useCallback((updated: Contestant) => {
    setEvents(prev => prev.map((e, i) =>
      i === activeEventIndex
        ? { ...e, contestants: e.contestants.map(c => c.id === updated.id ? updated : c) }
        : e
    ));
  }, [activeEventIndex]);

  const handleNewEvent = () => {
    const newEvt = createEvent('');
    setEvents(prev => [...prev, newEvt]);
    setActiveEventIndex(events.length);
  };

  const handleRemoveEvent = (index: number) => {
    if (events.length <= 1) return;
    setEvents(prev => prev.filter((_, i) => i !== index));
    setActiveEventIndex(prev =>
      prev >= index ? Math.max(0, prev - 1) : prev
    );
  };

  const handleLoadSession = useCallback((session: JudgingSession) => {
    let loadedEvents: EventGroup[] = [];
    if (session.events && session.events.length > 0) {
      loadedEvents = session.events.map(e => ({ ...e, idealTime: e.idealTime ?? 0 }));
    } else if ((session as JudgingSession & { rounds?: EventGroup[] }).rounds?.length) {
      const rounds = (session as JudgingSession & { rounds: EventGroup[] }).rounds;
      loadedEvents = rounds.map(r => ({ ...r, idealTime: (r as EventGroup).idealTime ?? 0 }));
    } else if (session.contestants && session.eventName) {
      loadedEvents = [{
        id: crypto.randomUUID(),
        eventName: session.eventName,
        idealTime: 0,
        contestants: session.contestants.map(c => ({ ...c, duration: c.duration ?? 0 })),
        createdAt: session.createdAt,
      }];
    }
    setEvents(loadedEvents);
    setActiveEventIndex(0);
    setIdealTimeInput(loadedEvents[0]?.idealTime ? formatIdealTime(loadedEvents[0].idealTime) : '');
    setShowHistory(false);
  }, []);

  const generateFullExport = (): string => {
    const lines = [
      'Speech & Debate — Full Judging Export',
      `Date: ${new Date().toLocaleDateString()}`,
      `Events: ${events.length}`,
      '',
    ];
    for (let ei = 0; ei < events.length; ei++) {
      const evt = events[ei];
      lines.push('='.repeat(50));
      lines.push(`Event ${ei + 1}: ${evt.eventName || 'Untitled'}`);
      if (evt.idealTime) {
        lines.push(`Ideal Time: ${formatIdealTime(evt.idealTime)}`);
      }
      lines.push(`Contestants: ${evt.contestants.length}`);
      lines.push('');
      const sorted = [...evt.contestants].sort((a, b) => b.score - a.score);
      for (let ci = 0; ci < sorted.length; ci++) {
        const c = sorted[ci];
        const dur = c.duration
          ? ` (${Math.floor(c.duration / 60)}m ${c.duration % 60}s)`
          : '';
        lines.push(`  ${ci + 1}. ${c.name} — Score: ${c.score}/30${dur}`);
        lines.push(`     ${c.feedback}`);
        if (c.transcript) {
          lines.push('');
          lines.push(`     Transcript:`);
          lines.push(`     ${c.transcript}`);
        }
        lines.push('');
      }
    }
    return lines.join('\n');
  };

  const handleExportAll = async () => {
    const text = generateFullExport();
    await window.electronAPI.clipboardWrite(text);
  };

  const totalContestants = events.reduce((sum, e) => sum + e.contestants.length, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Drag region for macOS title bar — scrolls with content */}
      <div className="h-10 app-drag" />
      <div className="max-w-3xl mx-auto px-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pt-1">
          <label className="text-sm text-gray-400 whitespace-nowrap shrink-0">Event:</label>
          <input
            type="text"
            value={activeEvent?.eventName || ''}
            onChange={(e) => setActiveEventName(e.target.value)}
            list="event-presets"
            placeholder="e.g. Extemp, LD, OI..."
            className="flex-1 min-w-[120px] bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <datalist id="event-presets">
            {EVENT_PRESETS.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
          <label className="text-sm text-gray-400 whitespace-nowrap shrink-0">Time:</label>
          <input
            type="text"
            value={idealTimeInput}
            onChange={(e) => setIdealTimeInput(e.target.value)}
            onBlur={handleIdealTimeBlur}
            placeholder="m:ss"
            title="Ideal/max speech time (e.g. 7:00 or 10:00)"
            className="w-14 shrink-0 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm text-center"
          />
          <div className="flex gap-2 shrink-0">
            {totalContestants > 0 && (
              <ExportAllButton onExport={handleExportAll} />
            )}
            <button
              onClick={() => setShowHistory(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-600 transition-colors"
            >
              History
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-600 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Event Tabs */}
        <div className="flex flex-wrap items-center gap-1 mb-4 pt-3">
          {events.map((evt, i) => (
            <div key={evt.id} className="flex items-center">
              <button
                onClick={() => setActiveEventIndex(i)}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                  i === activeEventIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                } ${events.length > 1 ? 'rounded-r-none' : ''}`}
              >
                {evt.eventName || `Event ${i + 1}`}
              </button>
              {events.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveEvent(i);
                  }}
                  className={`px-1.5 py-1.5 text-xs rounded-r-lg transition-colors ${
                    i === activeEventIndex
                      ? 'bg-blue-700 text-blue-200 hover:bg-red-600 hover:text-white'
                      : 'bg-gray-800 text-gray-500 hover:bg-red-600 hover:text-white border border-l-0 border-gray-700'
                  }`}
                  title="Remove event"
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleNewEvent}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 border-dashed transition-colors"
          >
            + New Event
          </button>
        </div>

        {/* Judging Panel */}
        <JudgingPanel
          eventName={activeEvent?.eventName || ''}
          idealTime={activeEvent?.idealTime || 0}
          onContestantJudged={handleContestantJudged}
          contestantCount={activeEvent?.contestants.length || 0}
          existingScores={(activeEvent?.contestants || []).map(c => ({ name: c.name, score: c.score }))}
        />

        {/* Contestant List */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <ExportButton
              eventName={activeEvent?.eventName || ''}
              contestants={activeEvent?.contestants || []}
            />
          </div>
          <ContestantList
            contestants={activeEvent?.contestants || []}
            onContestantUpdated={handleContestantUpdated}
          />
        </div>
      </div>

      {/* Modals */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHistory && (
        <HistoryView
          onClose={() => setShowHistory(false)}
          onLoadSession={handleLoadSession}
        />
      )}
    </div>
  );
}

function ExportAllButton({ onExport }: { onExport: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    await onExport();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
    >
      {copied ? 'Copied all!' : 'Export All Events'}
    </button>
  );
}
