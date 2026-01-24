'use client';

import React from 'react';
import type { AcademicProjectData, Author } from '@/lib/types';

export type { AcademicProjectData };

interface AcademicProjectPageProps {
  data: AcademicProjectData;
}

export default function AcademicProjectPage({ data }: AcademicProjectPageProps) {
  const {
    title,
    authors,
    institution,
    venue,
    year,
    abstract,
    highlights,
    detailedDescription,
    links,
    teaserVideo,
    carousel,
    youtubeVideoId,
    poster,
    bibtex,
    relatedWorks,
  } = data;

  // Extract unique affiliations and create mapping
  const uniqueAffiliations = Array.from(
    new Set(authors.filter((a) => a.affiliation).map((a) => a.affiliation as string))
  );
  const affiliationMap = Object.fromEntries(
    uniqueAffiliations.map((aff, idx) => [aff, idx + 1])
  );

  // Get affiliation index for an author
  const getAffiliationIndex = (author: Author) => {
    if (!author.affiliation) return null;
    return affiliationMap[author.affiliation];
  };

  const hasAffiliations = uniqueAffiliations.length > 0;

  return (
    <div className="academic-project-page">
      {/* Scroll to Top Button */}
      <button
        className="scroll-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>

      {/* More Works Dropdown */}
      {relatedWorks && relatedWorks.length > 0 && (
        <div className="more-works-container">
          <button
            className="more-works-btn"
            onClick={() => {
              const dropdown = document.getElementById('moreWorksDropdown');
              dropdown?.classList.toggle('active');
            }}
            title="View More Works from Our Lab"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-.586 3.414-3.414a4 4 0 00-5.657-5.657l-5-5A2 2 0 008 4z"
              />
            </svg>
            More Works
            <svg
              className="w-4 h-4 dropdown-arrow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="more-works-dropdown" id="moreWorksDropdown">
            <div className="dropdown-header">
              <h4>More Works from Our Lab</h4>
              <button
                className="close-btn"
                onClick={() => {
                  const dropdown = document.getElementById('moreWorksDropdown');
                  dropdown?.classList.remove('active');
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="works-list">
              {relatedWorks.map((work, idx) => (
                <a
                  key={idx}
                  href={work.url}
                  className="work-item"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="work-info">
                    <h5>{work.title}</h5>
                    <p>{work.description}</p>
                    <span className="work-venue">{work.venue}</span>
                  </div>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="text-center">
            <h1 className="publication-title">{title}</h1>

            {/* Authors */}
            <div className="publication-authors">
              {authors.map((author, idx) => {
                const affIndex = getAffiliationIndex(author);
                return (
                  <span key={idx} className="author-block">
                    {author.url ? (
                      <a
                        href={author.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="author-link"
                      >
                        {author.name}
                      </a>
                    ) : (
                      <span>{author.name}</span>
                    )}
                    {affIndex && <sup>{affIndex}</sup>}
                    {author.equalContribution && <sup>*</sup>}
                    {idx < authors.length - 1 && ', '}
                  </span>
                );
              })}
            </div>

            {/* Affiliations */}
            {hasAffiliations && (
              <div className="publication-affiliations">
                {uniqueAffiliations.map((aff, idx) => (
                  <span key={idx} className="affiliation-block">
                    <sup>{idx + 1}</sup>{aff}
                    {idx < uniqueAffiliations.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}

            {/* Institution & Venue */}
            <div className="publication-meta">
              <span>
                {!hasAffiliations && institution}
                <br />
                {venue} {year}
              </span>
              {authors.some((a) => a.equalContribution) && (
                <span className="eql-cntrb">
                  <small>
                    <br />
                    <sup>*</sup>Equal Contribution
                  </small>
                </span>
              )}
            </div>

            {/* Links */}
            <div className="publication-links">
              {links?.map((link, idx) => (
                <span key={idx} className="link-block">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    <LinkIcon type={link.type} />
                    <span>{getLinkLabel(link.type)}</span>
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Teaser Video */}
      {teaserVideo && (
        <section className="teaser-section">
          <div className="container">
            <video
              poster=""
              id="teaser-video"
              autoPlay
              controls
              muted
              loop
              preload="metadata"
              className="teaser-video"
            >
              <source src={teaserVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </section>
      )}

      {/* Abstract */}
      <section className="abstract-section">
        <div className="container">
          <div className="text-center">
            <h2>Abstract</h2>
            <div className="abstract-content">{abstract}</div>
          </div>
        </div>
      </section>

      {/* Detailed Description */}
      {detailedDescription && (
        <section className="detailed-description-section">
          <div className="container">
            {detailedDescription.problem && detailedDescription.problem.length > 0 && (
              <div className="description-block">
                <h3>문제 정의</h3>
                <ul className="description-list">
                  {detailedDescription.problem.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailedDescription.method && detailedDescription.method.length > 0 && (
              <div className="description-block">
                <h3>제안 방법</h3>
                <ul className="description-list">
                  {detailedDescription.method.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailedDescription.results && detailedDescription.results.length > 0 && (
              <div className="description-block">
                <h3>실험 결과</h3>
                <ul className="description-list">
                  {detailedDescription.results.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Image Carousel */}
      {carousel && carousel.length > 0 && (
        <section className="carousel-section">
          <div className="container">
            <div id="results-carousel" className="results-carousel">
              {carousel
                .filter((item) =>
                  !item.src.startsWith('PLACEHOLDER') &&
                  !item.src.startsWith('GENERATE_') &&
                  item.src.length > 0
                )
                .map((item, idx) => (
                  <div key={idx} className="carousel-item">
                    <div className="carousel-media-wrapper">
                      {item.type === 'image' ? (
                        <img
                          src={item.src}
                          alt={item.caption}
                          loading="lazy"
                          className="carousel-image"
                        />
                      ) : (
                        <video
                          poster=""
                          id={`video-${idx}`}
                          controls
                          muted
                          loop
                          preload="metadata"
                          className="carousel-video"
                        >
                          <source src={item.src} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                    <p className="carousel-caption">{item.caption}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* YouTube Video */}
      {youtubeVideoId && (
        <section className="youtube-section">
          <div className="container">
            <h2>Video Presentation</h2>
            <div className="video-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video Presentation"
              />
            </div>
          </div>
        </section>
      )}

      {/* Poster */}
      {poster?.pdfUrl && (
        <section className="poster-section">
          <div className="container">
            <h2>Poster</h2>
            <iframe src={poster.pdfUrl} className="poster-iframe" />
          </div>
        </section>
      )}

      {/* BibTeX */}
      {bibtex && (
        <section className="bibtex-section">
          <div className="container">
            <div className="bibtex-header">
              <h2>BibTeX</h2>
              <button
                className="copy-bibtex-btn"
                onClick={() => {
                  navigator.clipboard.writeText(bibtex.code || '');
                  alert('BibTeX copied to clipboard!');
                }}
                title="Copy BibTeX to clipboard"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="copy-text">Copy</span>
              </button>
            </div>
            <pre className="bibtex-code">
              <code>{bibtex.code}</code>
            </pre>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="template-footer">
        <div className="container">
          <p>
            This page was built using the{' '}
            <a
              href="https://github.com/eliahuhorwitz/Academic-project-page-template"
              target="_blank"
              rel="noopener noreferrer"
            >
              Academic Project Page Template
            </a>
            . This website is licensed under a{' '}
            <a
              rel="license noopener noreferrer"
              href="http://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
            >
              Creative Commons Attribution-ShareAlike 4.0 International License
            </a>
            .
          </p>
        </div>
      </footer>

      <style jsx>{`
        .academic-project-page {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #363636;
        }

        /* Scroll to top button */
        .scroll-to-top {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 45px;
          height: 45px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s;
          z-index: 100;
        }
        .scroll-to-top:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        /* More works dropdown */
        .more-works-container {
          position: fixed;
          bottom: 85px;
          right: 30px;
          z-index: 99;
        }
        .more-works-btn {
          background: #363636;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s;
        }
        .more-works-btn:hover {
          background: #209cee;
        }
        .dropdown-arrow {
          transition: transform 0.3s;
        }
        .more-works-dropdown {
          position: absolute;
          bottom: 50px;
          right: 0;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.3s;
        }
        .more-works-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #f5f5f5;
        }
        .dropdown-header h4 {
          margin: 0;
          font-size: 16px;
          color: #363636;
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
        }
        .works-list {
          padding: 8px 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .work-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          color: #363636;
          text-decoration: none;
          transition: background 0.2s;
        }
        .work-item:hover {
          background: #f5f5f5;
        }
        .work-info h5 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }
        .work-info p {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #7a7a7a;
        }
        .work-venue {
          font-size: 11px;
          color: #209cee;
        }

        /* Hero Section */
        .hero-section {
          padding: 80px 20px 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        .publication-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 24px;
          line-height: 1.2;
        }
        .publication-authors {
          font-size: 1.25rem;
          margin-bottom: 8px;
        }
        .publication-affiliations {
          font-size: 0.95rem;
          margin-bottom: 16px;
          opacity: 0.95;
        }
        .affiliation-block sup {
          margin-right: 2px;
        }
        .author-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
        }
        .author-link:hover {
          text-decoration: underline;
        }
        .publication-meta {
          font-size: 1rem;
          opacity: 0.9;
        }
        .publication-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }
        .link-block a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .link-block a:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Teaser Section */
        .teaser-section {
          background: #fafafa;
        }
        .teaser-video {
          width: 100%;
          max-height: 500px;
          border-radius: 12px;
        }

        /* Abstract Section */
        .abstract-section {
          padding: 60px 20px;
          background: white;
        }
        .abstract-section h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 24px;
        }
        .abstract-content {
          font-size: 1.1rem;
          line-height: 1.8;
          text-align: justify;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Detailed Description Section */
        .detailed-description-section {
          padding: 60px 20px;
          background: #f8f9fa;
        }
        .detailed-description-section .container {
          max-width: 900px;
          margin: 0 auto;
        }
        .description-block {
          margin-bottom: 40px;
          padding: 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .description-block:last-child {
          margin-bottom: 0;
        }
        .description-block h3 {
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #333;
          padding-bottom: 12px;
          border-bottom: 2px solid #667eea;
        }
        .description-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .description-list li {
          position: relative;
          padding-left: 28px;
          font-size: 1rem;
          line-height: 1.7;
          color: #444;
        }
        .description-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          top: 1px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: bold;
        }

        /* Carousel Section */
        .carousel-section {
          padding: 40px 0;
          background: #fafafa;
        }
        .results-carousel {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 20px;
          padding: 0 20px;
          justify-content: center;
        }
        .carousel-item {
          flex-shrink: 0;
          scroll-snap-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .carousel-media-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .carousel-image,
        .carousel-video {
          width: 100%;
          max-width: 700px;
          height: auto;
          border-radius: 12px;
          display: block;
          margin: 0 auto;
        }
        .carousel-caption {
          text-align: center;
          margin-top: 12px;
          font-size: 0.9rem;
          color: #666;
        }

        /* YouTube Section */
        .youtube-section {
          padding: 60px 20px;
          background: white;
        }
        .youtube-section h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 24px;
        }
        .video-wrapper {
          max-width: 800px;
          margin: 0 auto;
          aspect-ratio: 16 / 9;
        }
        .video-wrapper iframe {
          width: 100%;
          height: 100%;
          border-radius: 12px;
        }

        /* Poster Section */
        .poster-section {
          padding: 60px 20px;
          background: #fafafa;
        }
        .poster-section h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 24px;
        }
        .poster-iframe {
          width: 100%;
          height: 600px;
          border-radius: 12px;
          border: 1px solid #ddd;
        }

        /* BibTeX Section */
        .bibtex-section {
          padding: 60px 20px;
          background: white;
        }
        .bibtex-header {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .bibtex-header h2 {
          font-size: 2rem;
          margin: 0;
        }
        .copy-bibtex-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #363636;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .copy-bibtex-btn:hover {
          background: #209cee;
        }
        .bibtex-code {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .bibtex-code code {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          color: #363636;
        }

        /* Footer */
        .template-footer {
          padding: 40px 20px;
          background: #363636;
          color: #b5b5b5;
          text-align: center;
        }
        .template-footer a {
          color: #485fc7;
          text-decoration: none;
        }
        .template-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .publication-title {
            font-size: 1.8rem;
          }
          .publication-authors {
            font-size: 1rem;
          }
          .publication-links {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}

function LinkIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    paper: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    code: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-.536-.734-1.334-1.334-1.334-.886 0-1.65.715-1.65 1.65v3.315c0 .316.192.688.793.577 4.765-1.587 8.207-6.085 8.207-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    arxiv: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm1-4h-2V7h2v6z" />
      </svg>
    ),
    supplementary: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  };
  return icons[type] || icons.paper;
}

function getLinkLabel(type: string): string {
  const labels: Record<string, string> = {
    paper: 'Paper',
    code: 'Code',
    arxiv: 'arXiv',
    supplementary: 'Supplementary',
  };
  return labels[type] || type;
}
