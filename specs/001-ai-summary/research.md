# Research: AI 요약 기능 추가

**Feature**: AI 요약 기능 (001-ai-summary)
**Date**: 2026-01-14
**Status**: Complete

## Overview

This document captures research findings and technical decisions for implementing the AI summary feature in the modulabs-result-site project.

## Technical Decisions

### Decision 1: Component Architecture

**Choice**: Create a dedicated `AISummary.astro` component

**Rationale**:
- Reusability: Can be used in multiple contexts (detail page, list preview, cards)
- Separation of concerns: Summary logic isolated from project detail layout
- Testability: Easier to unit test in isolation
- Consistency with existing pattern: Other features like `VideoPlayer.astro`, `ImageCarousel.astro` follow this pattern

**Alternatives Considered**:
- Inline summary in `ProjectDetail.astro`: Rejected because it mixes concerns and reduces reusability
- React component (`AISummary.tsx`): Rejected because summary display is static (no interactivity needed beyond simple toggle)

---

### Decision 2: Markdown Rendering Approach

**Choice**: Use Astro's built-in `<Markdown />` component or `@astrojs/markdown-remark` plugin

**Rationale**:
- Already available in Astro projects (no new dependencies)
- Supports GitHub Flavored Markdown (GFM)
- Handles Korean text correctly with proper encoding
- Compatible with static site generation

**Alternatives Considered**:
- `react-markdown`: Rejected because it requires React hydration (unnecessary for static content)
- Custom markdown parser: Rejected because reinventing the wheel, security concerns

---

### Decision 3: Character Counting for Korean Text

**Choice**: Use JavaScript's native `String.length` property

**Rationale**:
- JavaScript strings are UTF-16, and Korean characters (한글) are single code units
- `String.length` correctly counts each Korean character as 1
- No external libraries needed
- Spec clarifies character count includes spaces/punctuation

**Alternatives Considered**:
- `Array.from(text).length`: Same result, more verbose
- Intl.Segmenter (Korean word segmentation): Useful for word counting but not needed here

**Code Example**:
```typescript
function getCharacterCount(text: string): number {
  return text.length; // Works correctly for Korean text
}
```

---

### Decision 4: Expand/Collapse Implementation

**Choice**: Use React island (`AISummaryToggle.tsx`) for interactive state management

**Rationale**:
- Need client-side state (expanded/collapsed)
- Astro's React islands provide hydration for interactive components
- Minimal overhead for just this small interaction
- Consistent with existing pattern of using React for interactivity

**Alternatives Considered**:
- Vanilla JS with data attributes: Rejected because less maintainable in TypeScript/Astro context
- Web Component: Rejected because adds complexity for simple use case
- Alpine.js: Rejected because not already in dependencies

---

### Decision 5: Accessibility (ARIA) Implementation

**Choice**: Use semantic HTML with ARIA region role and label

**Rationale**:
- WCAG 2.1 AA compliance requirement
- Screen readers need to identify the summary section
- `role="region"` with `aria-label="AI 요약"` provides clear semantic meaning

**Implementation Pattern**:
```html
<section role="region" aria-label="AI 요약">
  <h2>AI 요약</h2>
  <p>{summary}</p>
</section>
```

**Alternatives Considered**:
- No ARIA attributes: Rejected because fails accessibility requirement
- `role="article"`: Less appropriate than `region` for this standalone section

---

### Decision 6: Visual Distinction Styling

**Choice**: Use Tailwind CSS with subtle background color and left border

**Rationale**:
- Consistent with existing Tailwind usage in project
- Lightweight (no additional CSS files)
- Easy to maintain and modify

**Proposed Styling**:
```html
<div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4">
  <!-- Summary content -->
</div>
```

**Alternatives Considered**:
- Custom CSS class: Rejected because Tailwind utilities are sufficient
- Card component wrapper: Overkill for simple visual distinction

---

### Decision 7: Zod Schema Definition

**Choice**: Add `aiSummary` as `z.string()` with `.default("")`

**Rationale**:
- Required field per spec clarification
- Empty string allowed for projects without summaries
- Zod already in use for content validation
- Type safety ensures correct data types

**Schema Addition**:
```typescript
import { defineCollection, z } from 'astro:content';

const project = defineCollection({
  schema: z.object({
    // ... existing fields
    aiSummary: z.string().default(""),
  }),
});
```

**Alternatives Considered**:
- `z.string().optional()`: Rejected because spec says required field
- Union type with null: Rejected because empty string is simpler

---

## Best Practices Summary

### Astro Component Development
- Use `.astro` files for static/presentational components
- Use React `.tsx` files for interactive components (state, events)
- Define TypeScript props interfaces for type safety
- Use scoped styles (`<style>` tags in `.astro` files) when needed

### Accessibility (a11y)
- Use semantic HTML elements (`section`, `h2`, `p`)
- Add ARIA labels for non-obvious content regions
- Ensure sufficient color contrast (WCAG AA: 4.5:1 for text)
- Test with screen reader (NVDA, JAWS, VoiceOver)

### Tailwind CSS
- Use utility classes for layout and spacing
- Use `dark:` prefix for dark mode support
- Use responsive prefixes (`md:`, `lg:`) for mobile-first design
- Avoid `@apply` directive (use utilities directly)

### TypeScript in Astro
- Enable strict mode for type safety
- Use interfaces for props definitions
- Use type assertions sparingly
- Leverage Zod for runtime validation

## External Dependencies

No new dependencies required. All functionality can be implemented with:
- Astro 4.x (built-in)
- React 18.x (already in use)
- Tailwind CSS 3.x (already in use)
- Zod 3.x (already in use)

## Migration Notes

### Existing Project Data Migration
When adding the `aiSummary` field to existing project JSON files:
1. Add `"aiSummary": ""` to all existing projects
2. New projects can have pre-filled summaries
3. Empty string will hide the summary section (per FR-002)

### Backward Compatibility
- Old project data without `aiSummary` field will use Zod default value
- No breaking changes to existing components
- Feature is additive only

## Security Considerations

- Markdown rendering: Sanitize user input if summaries can be user-generated
- XSS protection: Astro's markdown renderer escapes HTML by default
- No external API calls, so no API security concerns

## Performance Considerations

- Static content: No runtime overhead for summary display
- Expand/collapse: Minimal React hydration cost
- Markdown processing: Happens at build time (SSG)
- Character counting: O(n) but negligible for 100-500 character strings

## References

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)
