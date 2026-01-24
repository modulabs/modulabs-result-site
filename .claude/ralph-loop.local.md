# Ralph Loop Configuration

## Task
Complete comprehensive code refactoring for the modulabs-result-site project.

## Completion Promise
```yaml
completion_promise: "I have completed all 5 phases of refactoring: (1) Removed all legacy Astro files and configurations, (2) Created a unified type definition system in src/lib/types.ts with proper exports, (3) Refactored API routes by splitting large routes into focused service modules, (4) Broke down large components into smaller composable pieces, and (5) Ran code style cleanup with ESLint/Prettier and verified build passes without errors."
```

## Phases

### Phase 1: Remove Legacy Astro Files
- Delete src/pages/ directory (Astro pages)
- Delete src/components/*.astro files
- Delete src/layouts/ directory
- Delete astro.config.* files
- Remove Astro dependencies from package.json
- Update imports to use React components only

### Phase 2: Unified Type System
- Create src/lib/types.ts with:
  - Project interface (unified from Zod + separate interfaces)
  - Author interface
  - Link interface
  - API request/response types
- Update all files to import from types.ts
- Remove duplicate type definitions

### Phase 3: API Route Refactoring
- Split src/app/api/generate/route.ts into:
  - src/lib/services/pdf-processor.ts
  - src/lib/services/ai-generator.ts
  - src/lib/services/file-storage.ts
  - src/lib/services/response-formatter.ts
- Create API utilities in src/lib/api-utils.ts

### Phase 4: Component Structure
- Break AcademicProjectPage.tsx (967 lines) into:
  - components/academic/HeroSection.tsx
  - components/academic/AuthorsSection.tsx
  - components/academic/AbstractSection.tsx
  - components/academic/VideoSection.tsx
  - components/academic/BibTeXSection.tsx
- Extract inline styles to CSS modules or Tailwind

### Phase 5: Code Style & Performance
- Configure ESLint + Prettier
- Run format on all files
- Update tsconfig.json for stricter settings
- Verify build passes
- Run linter and fix all issues

## Notes
- Build command: npm run build
- Lint command: npm run lint
- Test after each phase
