# Implementation Plan: 모두의연구소 LAB 결과물 사이트

**Branch**: `001-lab-results-site` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-lab-results-site/spec.md`

## Summary

모두의연구소 LAB에서 생산된 산출 결과물(GitHub 저장소, 논문)을 전시하는 정적 웹사이트를 구축합니다. 메인 페이지에 결과물 목록을 카드 형태로 표시하고, 클릭 시 Academic Project Page Template 스타일의 상세 페이지로 이동합니다. Astro + React + Tailwind CSS 기반의 정적 사이트 생성기를 사용하며, JSON 파일로 데이터를 관리합니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Astro 4.x
**Primary Dependencies**: Astro, React, Tailwind CSS, Zod
**Storage**: JSON files (Content Collections)
**Testing**: Vitest, Playwright
**Target Platform**: Static web hosting (GitHub Pages)
**Project Type**: web
**Performance Goals**:
  - First Contentful Paint: < 1.5s
  - Largest Contentful Paint: < 2.5s
  - Page load: < 2s (SC-003)
  - Search/Filter response: < 1s (SC-006)
**Constraints**:
  - Page load failure rate: < 1% (SC-007)
  - Mobile responsive required (SC-005)
  - No authentication (public access)
**Scale/Scope**:
  - Initial: 10-50 projects
  - Expected growth: 100+ projects over time
  - Single language: Korean

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Simplicity | ✓ Pass | Static site, no backend, minimal dependencies |
| Performance | ✓ Pass | Static generation, image optimization, lazy loading |
| Accessibility | ✓ Pass | WCAG 2.1 AA target, keyboard navigation |
| SEO | ✓ Pass | Open Graph tags, structured data, sitemap |
| Maintainability | ✓ Pass | JSON data, TypeScript schemas, clear structure |

## Project Structure

### Documentation (this feature)

```text
specs/001-lab-results-site/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Technology decisions
├── data-model.md        # Phase 1 output - Entity definitions
├── quickstart.md        # Phase 1 output - Setup guide
├── contracts/           # Phase 1 output - API/Component contracts
│   └── api-contract.md  # Data access and component contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
src/
├── components/          # Astro/React components
│   ├── ProjectCard.astro       # Project card for list view
│   ├── ProjectDetail.astro     # Project detail page component
│   ├── FilterBar.astro         # Type filter and search
│   ├── EmptyState.astro        # No results state
│   ├── VideoPlayer.astro       # YouTube/video player
│   └── ImageCarousel.astro     # Image gallery
├── content/             # Content Collections
│   ├── config.ts               # Collection schema definitions
│   └── projects/               # Project data files
│       ├── probex.json
│       └── ...
├── layouts/             # Page layouts
│   └── Layout.astro            # Base layout with SEO
├── pages/               # File-based routing
│   ├── index.astro             # Main page (project list)
│   └── projects/
│       └── [id].astro          # Project detail page
├── styles/              # Global styles
│   └── global.css
└── lib/                 # Utility functions
    └── utils.ts                 # Search, filter, share functions

public/                  # Static assets
├── images/              # Project images
├── papers/              # PDF posters
└── favicon.ico
```

**Structure Decision**: Web application pattern with static site generation. Content Collections for data management ensures type safety while maintaining simplicity. Component-based architecture supports both Astro (.astro) and React (.tsx) for interactive elements.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Main Page  │  │ Detail Page  │  │  Components  │    │
│  │  (index.astro)│  │([id].astro) │  │  (React)     │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         └─────────────────┴─────────────────┘             │
│                           │                               │
│                           ▼                               │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Content Collections (Data Access)          │   │
│  │  - getCollection('projects')                      │   │
│  │  - Type-safe with Zod schemas                     │   │
│  └────────────────────────────────────────────────────┘   │
│                           │                               │
│                           ▼                               │
│  ┌────────────────────────────────────────────────────┐   │
│  │           JSON Files (projects/*.json)             │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Build Time (Astro)                       │
│  1. Read JSON files → Validate with Zod                    │
│  2. Generate static HTML for each page                     │
│  3. Optimize images (WebP/AVIF, srcset)                    │
│  4. Generate sitemap & RSS feed                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action          Component           Data Source
─────────────────────────────────────────────────────────────────
Visit /         →   index.astro    →   getCollection('projects')
                      ↓                        ↓
                   FilterBar              filterByType()
                      ↓                        ↓
                   ProjectCard[]          searchProjects()

Click Project   →   [id].astro     →   getCollection('projects')
                      ↓                        ↓
                   ProjectDetail        find(p => p.id === id)
                      ↓
                   VideoPlayer,           media.teaserVideo
                   ImageCarousel,          → media.images
                   BibTeXButton            → paper.bibtex
```

## Implementation Phases

### Phase 0: Research & Technology Selection ✓
**Status**: Complete
**Output**: [research.md](./research.md)

Key decisions:
- Astro + React + Tailwind CSS
- JSON data with Content Collections
- GitHub Pages hosting
- Client-side filtering/search

### Phase 1: Design & Contracts ✓
**Status**: Complete
**Outputs**:
- [data-model.md](./data-model.md) - Entity definitions and validation rules
- [contracts/api-contract.md](./contracts/api-contract.md) - Component contracts and data access
- [quickstart.md](./quickstart.md) - Setup and development guide

### Phase 2: Task Breakdown
**Status**: Pending
**Command**: `/speckit.tasks`
**Output**: tasks.md with dependency-ordered implementation tasks

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| astro | ^4.x | Static site generator |
| @astrojs/react | ^3.x | React integration |
| @astrojs/tailwind | ^5.x | Tailwind CSS integration |
| react | ^18.x | UI components |
| react-dom | ^18.x | React rendering |
| tailwindcss | ^3.x | Utility-first CSS |
| zod | ^3.x | Schema validation |
| @astrojs/sitemap | ^3.x | Sitemap generation |

## Non-Functional Requirements

### Performance
- Image lazy loading
- Code splitting by route
- Preload critical CSS
- Service worker for offline caching (future)

### Accessibility
- Semantic HTML
- ARIA labels for interactive elements
- Keyboard navigation
- Focus management
- Color contrast ratios (WCAG AA)

### SEO
- Unique meta tags per page
- Open Graph and Twitter Cards
- Structured data (Schema.org)
- XML sitemap
- robots.txt

### Security
- Content Security Policy
- HTTPS only
- Subresource Integrity (for external scripts)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large data size | Implement pagination or virtual scrolling |
| Broken external links | Graceful degradation with error states |
| Slow image loads | Progressive loading with blur-up |
| Mobile UX issues | Mobile-first responsive design |

## Migration Notes

This is a greenfield project. No existing data or systems to migrate.

## Success Criteria Alignment

| Spec Criterion | Implementation |
|----------------|----------------|
| SC-001: 3s page load | Static generation, minimal JS |
| SC-002: One-click access | Direct card links |
| SC-003: 2s detail load | Pre-generated pages, optimized images |
| SC-004: 3 clicks max | Intuitive navigation |
| SC-005: Mobile support | Responsive design, Touch targets |
| SC-006: 1s filter response | Client-side filtering |
| SC-007: <1% failure rate | Static hosting, no backend |
| SC-008: One-click BibTeX | Copy button with clipboard API |

---

**Plan Version**: 1.0
**Last Updated**: 2026-01-14
**Ready for Phase 2**: Yes → Run `/speckit.tasks`
