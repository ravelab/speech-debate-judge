import React, { useState } from 'react';
import type { Contestant } from '../lib/types';

interface ExportButtonProps {
  eventName: string;
  contestants: Contestant[];
}

export function ExportButton({ eventName, contestants }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateExportText = (): string => {
    const sorted = [...contestants].sort((a, b) => a.order - b.order);
    const lines = [
      `${eventName} — Judging Results`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Contestants: ${contestants.length}`,
      '',
      '---',
      '',
    ];

    for (const c of sorted) {
      const dur = c.duration
        ? ` (${Math.floor(c.duration / 60)}m ${c.duration % 60}s)`
        : '';
      lines.push(`${c.order}. ${c.name} — Score: ${c.score}/30${dur}`);
      lines.push(c.feedback);
      if (c.transcript) {
        lines.push('');
        lines.push(`Transcript: ${c.transcript}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleExport = async () => {
    const text = generateExportText();
    await window.electronAPI.clipboardWrite(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (contestants.length === 0) return null;

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded transition-colors"
    >
      {copied ? 'Copied to clipboard!' : 'Export Results'}
    </button>
  );
}
