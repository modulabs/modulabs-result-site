/**
 * AISummary Component
 * Displays AI-generated project summary with markdown support and accessibility features
 */
import React from 'react';

interface Props {
  summary: string;
}

export default function AISummary({ summary }: Props) {
  if (!summary?.trim()) {
    return null;
  }

  const hasContent = summary.trim().length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <section
      role="region"
      aria-label="AI 요약"
      className="ai-summary bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 md:p-5 lg:p-6 my-4"
    >
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
        {/* Lightning bolt / AI icon */}
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        AI 요약
      </h2>
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap">
          {summary}
        </p>
      </div>
    </section>
  );
}
