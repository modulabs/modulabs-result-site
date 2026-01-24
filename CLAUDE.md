# modulabs-result-site Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-14

## Active Technologies
- **TypeScript** 5.x (001-ai-summary)
- **Astro** 4.x (001-ai-summary)
- **React** 18.x (001-ai-summary)
- **Tailwind CSS** 3.x (001-ai-summary)
- **Zod** 3.x (001-ai-summary)

## Project Structure

```text
src/
├── components/          # Astro/React components
│   ├── ProjectDetail.astro     # Project detail page component
│   ├── AISummary.astro         # Static AI summary display
│   └── AISummaryToggle.tsx     # Interactive expand/collapse for long summaries
├── content/             # Content Collections (defined in content.config.ts)
│   └── projects/               # Project data files (*.md with frontmatter)
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

## Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:4321
npm run build            # Build for production
npm run preview          # Preview production build
npm run astro check      # Type checking

# Testing
npm run test             # Run tests (Vitest/Playwright)
```

## Code Style

**TypeScript/Astro**: Follow standard conventions

- Use `.astro` for static components
- Use `.tsx` for interactive React components (React islands)
- Define data schemas with Zod in `content.config.ts` (project root)
- Use TypeScript strict mode

**Tailwind CSS**: Utility-first approach

- Mobile-first responsive design
- Use `@apply` sparingly
- Custom theme in `tailwind.config.mjs`

**Data**:
- All project data in `src/content/projects/*.md` (markdown with frontmatter)
- Follow schema defined in `content.config.ts`
- Required fields: id, title, description, type, createdAt, authors, published
- Optional field: aiSummary (string, defaults to empty)

## Recent Changes
- 001-ai-summary: AI 요약 기능 추가 - AI-generated summaries displayed on project detail pages with expand/collapse for long summaries (>300 chars), markdown support, ARIA labels for accessibility, responsive design
- 001-lab-results-site: Initial project setup with Astro + React + Tailwind

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

## Commands

 - check-loop: ./check_promise.sh 
