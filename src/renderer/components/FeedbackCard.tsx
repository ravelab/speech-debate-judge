import React, { useState } from 'react';

interface FeedbackCardProps {
  score: number;
  feedback: string;
}

export function FeedbackCard({ score, feedback }: FeedbackCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await window.electronAPI.clipboardWrite(feedback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor =
    score >= 27 ? 'text-green-400' : score >= 24 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Feedback
        </h3>
        <span className={`text-2xl font-bold ${scoreColor}`}>
          {score}/30
        </span>
      </div>
      <div className="text-gray-200 text-sm leading-relaxed mb-3 whitespace-pre-line">
        {feedback}
      </div>
      <button
        onClick={copyToClipboard}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
      >
        {copied ? 'Copied!' : 'Copy Feedback'}
      </button>
    </div>
  );
}
