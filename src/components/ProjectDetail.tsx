/**
 * ProjectDetail Component
 * Displays detailed information about a project including AI summary
 */
import React from 'react';
import AISummary from './AISummary';
import AISummaryToggle from './AISummaryToggle';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  title: string;
  description: string;
  aiSummary: string;
  authors?: string[];
  type?: 'github' | 'paper' | 'video';
  createdAt?: Date;
}

export default function ProjectDetail({
  title,
  description,
  aiSummary,
  authors = [],
  type = 'github',
  createdAt,
}: Props) {
  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'yyyy년 M월 d일', { locale: ko });
  };

  // Determine if we need the toggle component (summary > 300 chars)
  const needsToggle = aiSummary && aiSummary.length > 300;

  return (
    <div className="project-detail container mx-auto px-4 py-8 max-w-4xl">
      {/* Project Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {title}
      </h1>

      {/* Project Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
        {type === 'github' ? (
          <span className="inline-flex items-center gap-1">
            <img src="/github-logo.svg" alt="GitHub" className="w-4 h-4" />
            GitHub
          </span>
        ) : type === 'video' ? (
          <span className="inline-flex items-center gap-1">
            <img src="/youtube-logo.png" alt="YouTube" className="w-4 h-4" />
            YouTube
          </span>

        ) : (
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            논문
          </span>
        )}
        {authors.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {authors.join(', ')}
          </span>
        )}
        {createdAt && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(createdAt)}
          </span>
        )}
      </div>

      {/* AI Summary Section */}
      {
        aiSummary?.trim() && needsToggle ? (
          <AISummaryToggle summary={aiSummary} maxChars={300} />
        ) : (
          <AISummary summary={aiSummary} />
        )
      }

      {/* Project Description */}
      <div className="prose prose-lg max-w-none mt-8">
        <p>{description}</p>
      </div>
    </div >
  );
}
