# Tasks: AI 요약 기능 추가

**Input**: Design documents from `/specs/001-ai-summary/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are optional for this feature. Test tasks can be added during implementation if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Astro)**: `src/` at repository root
- Paths follow the existing project structure from CLAUDE.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature setup and schema preparation

- [x] T001 Verify project dependencies (Astro 4.x, React 18.x, Tailwind CSS 3.x, Zod 3.x) via `npm list`
- [x] T002 Run `npm run astro check` to establish baseline type checking status

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and data changes that MUST complete before UI components can be built

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [x] T003 Add `aiSummary` field to project schema in `content.config.ts` as `z.string().default("")`
- [x] T004 Run `npm run astro check` to verify TypeScript types are regenerated after schema change
- [x] T005 Add `aiSummary: ""` to all existing project files in `src/content/projects/`

**Checkpoint**: Schema and data ready - UI component implementation can now begin

---

## Phase 3: User Story 1 - 결과물 상세 페이지에서 AI 요약 보기 (Priority: P1) 🎯 MVP

**Goal**: Display AI-generated summary below project title on detail pages, with markdown support and conditional rendering for empty summaries

**Independent Test**: Visit any project detail page - if `aiSummary` has content, it displays below the title with markdown rendered; if empty, nothing shows

### Implementation for User Story 1

- [x] T006 [P] [US1] Create `getCharacterCount` utility function in `src/lib/utils.ts`
- [x] T007 [P] [US1] Create `shouldTruncate` utility function in `src/lib/utils.ts`
- [x] T008 [US1] Create `AISummary.astro` component in `src/components/` with Props interface (summary: string, maxChars?: number)
- [x] T009 [US1] Implement empty summary check in `AISummary.astro` - return early if `summary.trim()` is empty
- [x] T010 [US1] Add semantic HTML structure to `AISummary.astro` - `<section role="region" aria-label="AI 요약">`
- [x] T011 [US1] Add AI icon/lightning bolt SVG and "AI 요약" heading to `AISummary.astro`
- [x] T012 [US1] Implement markdown rendering in `AISummary.astro` using Astro's `<slot />` or inline content
- [x] T013 [US1] Add Tailwind CSS classes for visual distinction in `AISummary.astro` (bg-blue-50, border-l-4 border-blue-500, rounded-r-lg, p-4)
- [x] T014 [US1] Add dark mode support to `AISummary.astro` (dark:bg-blue-900/20)
- [x] T015 [US1] Import and render `AISummary` component in `src/components/ProjectDetail.astro` below project title
- [x] T016 [US1] Pass `project.data.aiSummary` prop to `AISummary` component in `ProjectDetail.astro`

**Checkpoint**: AI summary displays on detail pages when content exists, hidden when empty - MVP core complete

---

## Phase 4: User Story 2 - 관리자가 AI 요약 생성 및 관리 (Priority: P1)

**Goal**: Enable admins to manage AI summaries by editing project JSON files directly

**Independent Test**: Edit `aiSummary` field in any project JSON file, rebuild, and verify the change appears on the detail page

### Implementation for User Story 2

- [x] T017 [US2] Verify Zod schema allows empty string by testing project with `"aiSummary": ""` in `src/content/projects/`
- [x] T018 [US2] Create example project with summary in `src/content/projects/` for testing (use data-model.md example)
- [x] T019 [US2] Create example project without summary in `src/content/projects/` for testing (empty string)
- [x] T020 [US2] Test summary update flow by modifying `aiSummary` in JSON and running `npm run build`

**Checkpoint**: Admins can add/edit/remove summaries via markdown files, changes reflect on built site

---

## Phase 5: User Story 3 - AI 요약 섹션의 시각적 구분 (Priority: P2)

**Goal**: Ensure AI summary section is visually distinct and recognizable with proper mobile responsive design

**Independent Test**: View project detail page on desktop and mobile - AI summary has distinct visual style (background color, border, icon) and is readable at all screen sizes

### Implementation for User Story 3

- [x] T021 [P] [US3] Add responsive padding classes to `AISummary.astro` (base p-4, md:p-5, lg:p-6)
- [x] T022 [P] [US3] Add responsive max-width to `AISummary.astro` content (prose classes)
- [x] T023 [US3] Verify color contrast ratio meets WCAG AA in `AISummary.astro` (blue-500 on white/light backgrounds)
- [x] T024 [US3] Add AI/lightning bolt icon SVG to `AISummary.astro` heading
- [x] T025 [US3] Test visual rendering at mobile breakpoint (375px width) via `npm run dev`
- [x] T026 [US3] Test visual rendering at desktop breakpoint (1280px+ width) via `npm run dev`

**Checkpoint**: AI summary section is visually distinct and fully responsive across all device sizes

---

## Phase 6: User Story 4 - 300자 이상 요약의 접기/펼치기 기능 (Priority: P1)

**Goal**: Implement expand/collapse toggle for summaries exceeding 300 characters, defaulting to collapsed state

**Independent Test**: Create/modify a project with `aiSummary` > 300 characters - view detail page, summary is collapsed by default with "더 보기" button, clicking expands content, "접기" button collapses again

### Implementation for User Story 4

- [x] T027 [P] [US4] Create `AISummaryToggle.tsx` React component in `src/components/` for interactive state
- [x] T028 [US4] Implement character count check in `AISummaryToggle.tsx` (threshold: 300 characters)
- [x] T029 [US4] Add collapsed state rendering in `AISummaryToggle.tsx` - show truncated text with "더 보기" button
- [x] T030 [US4] Add expanded state rendering in `AISummaryToggle.tsx` - show full text with "접기" button
- [x] T031 [US4] Implement click handler for toggle in `AISummaryToggle.tsx` (useState for isExpanded)
- [x] T032 [US4] Import `AISummaryToggle` client-side component in `src/components/ProjectDetail.astro`
- [x] T033 [US4] Conditionally render `AISummaryToggle` vs static content in `ProjectDetail.astro` based on character count
- [x] T034 [US4] Create test project with 400+ character `aiSummary` in `src/content/projects/` for testing
- [x] T035 [US4] Create test project with <300 character `aiSummary` in `src/content/projects/` for verification

**Checkpoint**: Long summaries collapse by default with working expand/collapse toggle

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, validation, and documentation

- [x] T036 [P] Run `npm run astro check` to verify no TypeScript errors
- [x] T037 [P] Run `npm run build` to verify production build succeeds
- [x] T038 [P] Run `npm run preview` to manually test built site
- [x] T039 [P] Test accessibility with screen reader simulation (verify ARIA labels announced correctly)
- [x] T040 [P] Test markdown rendering with various markdown formats (bold, italic, links, lists)
- [x] T041 [P] Test Korean text, emojis, and special characters in `aiSummary`
- [x] T042 Verify performance - summary renders within 1 second of page load (SC-001)
- [x] T043 Update `CLAUDE.md` Recent Changes section with `001-ai-summary` feature completion
- [x] T044 Validate all acceptance scenarios from spec.md across all user stories
- [x] T045 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**:
  - US1 (Display) depends on Foundational phase
  - US2 (Admin Management) depends on Foundational phase, parallel to US1
  - US3 (Visual Styling) depends on US1 (builds on AISummary component)
  - US4 (Expand/Collapse) depends on US1 (requires AISummary component base)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Display**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1) - Admin Management**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P2) - Visual Distinction**: Depends on US1 (modifies AISummary component created in US1)
- **User Story 4 (P1) - Expand/Collapse**: Depends on US1 (integrates with AISummary component created in US1)

### Within Each User Story

- Utility functions before components
- Component creation before integration
- Static implementation before interactive (React islands)
- Story complete before moving to next priority

### Parallel Opportunities

- T006-T007 (utility functions) can run in parallel
- T021-T022 (responsive styles) can run in parallel
- T027 (toggle component) can be developed in parallel with US2 tasks
- All Phase 7 tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch utility functions together:
Task: "Create getCharacterCount utility function in src/lib/utils.ts"
Task: "Create shouldTruncate utility function in src/lib/utils.ts"
```

---

## Parallel Example: User Story 4 (Expand/Collapse)

```bash
# While US2 (admin management) tasks are being done:
Task: "Create AISummaryToggle.tsx React component in src/components/"
```

---

## Implementation Strategy

### MVP First (User Story 1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Display summary with markdown)
4. Complete Phase 4: User Story 2 (Admin can manage summaries)
5. **STOP and VALIDATE**: Test AI summary display and management independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Schema and data ready
2. Add US1 + US2 → Basic summary display works → Deploy/Demo (MVP!)
3. Add US3 → Visual styling enhanced → Deploy/Demo
4. Add US4 → Expand/collapse for long summaries → Deploy/Demo
5. Polish → Production ready

### Parallel Team Strategy

With 2 developers (after Foundational phase completes):

- **Developer A**: US1 (Display) + US3 (Visual) + US4 (Expand/Collapse)
- **Developer B**: US2 (Admin Management) + data migration

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- This is an existing Astro project - no full project setup needed, only feature additions
- Type checking with `npm run astro check` should be run after schema changes
