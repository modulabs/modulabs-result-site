'use client';

/**
 * AISummaryToggle Component
 * Interactive React component for expandable/collapsible AI summaries
 */
import { useState } from 'react';

interface Props {
  summary: string;
  maxChars?: number;
}

const shouldTruncate = (text: string, threshold: number): boolean => text.length > threshold;

export default function AISummaryToggle({ summary, maxChars = 300 }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Default to collapsed state
  const needsToggle = shouldTruncate(summary, maxChars);
  const displayContent = needsToggle && !isExpanded
    ? summary.slice(0, maxChars)
    : summary;

  if (!summary?.trim()) {
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
          {displayContent}
          {needsToggle && !isExpanded && '...'}
        </p>
      </div>

      {needsToggle && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '접기' : '더 보기'}
        </button>
      )}

      <style>{`
        .ai-summary a {
          color: rgb(37 99 235);
          text-decoration: underline;
        }
        .ai-summary code {
          background-color: rgb(243 244 246);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .dark .ai-summary code {
          background-color: rgb(0 0 0);
        }
      `}</style>
    </section>
  );
}
