# Quickstart: AI 요약 기능 추가

**Feature**: AI 요약 기능 (001-ai-summary)
**Date**: 2026-01-14

## Overview

This guide helps developers quickly understand and implement the AI summary feature for project detail pages.

## What This Feature Does

Adds an AI-generated summary section to project detail pages that:
- Appears below the project title
- Shows only when a summary exists (empty strings are hidden)
- Supports markdown formatting
- Truncates long summaries (300+ characters) with expand/collapse
- Includes ARIA labels for accessibility
- Visually distinguishes from other content

## Quick Reference

### Files Changed

| File | Change |
|------|--------|
| `src/content/config.ts` | Add `aiSummary` field to project schema |
| `src/components/AISummary.astro` | NEW: Summary display component |
| `src/components/ProjectDetail.astro` | Import and render AISummary |
| `src/content/projects/*.json` | Add `aiSummary` field to each project |
| `src/lib/utils.ts` | Add character count utility (optional) |

### Key Code Snippets

#### 1. Schema Update (`src/content/config.ts`)

```typescript
const project = defineCollection({
  schema: z.object({
    // ... existing fields
    aiSummary: z.string().default(""),
  }),
});
```

#### 2. AISummary Component (`src/components/AISummary.astro`)

```astro
---
interface Props {
  summary: string;
  maxChars?: number;
}

const { summary, maxChars = 300 } = Astro.props;

// Skip rendering if empty
if (!summary?.trim()) {
  return;
}
---

<section
  role="region"
  aria-label="AI 요약"
  class="ai-summary bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4 my-4"
>
  <h2 class="text-lg font-semibold flex items-center gap-2 mb-2">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
    AI 요약
  </h2>
  <div class="prose prose-sm dark:prose-invert max-w-none">
    <slot />
  </div>
</section>

<style>
  /* Optional custom styles */
</style>
```

#### 3. Integration in ProjectDetail.astro

```astro
---
import AISummary from '../components/AISummary.astro';
import { getProject } from '../content';

const project = await getProject(params.id);
---

<h1>{project.data.title}</h1>

<!-- AI Summary (NEW) -->
<AISummary summary={project.data.aiSummary} />

<!-- Rest of project content -->
```

#### 4. Data File Example (`src/content/projects/example.json`)

```json
{
  "id": "example-project",
  "title": "예시 프로젝트",
  "description": "전체 설명...",
  "type": "github",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "authors": ["홍길동"],
  "published": true,
  "aiSummary": "이 프로젝트는 딥러닝을 활용한 이미지 분류 모델입니다. CNN을 사용하여 10개의 클래스로 분류하며, TensorFlow로 구현되었습니다."
}
```

## Development Workflow

### 1. Setup (First Time)

```bash
# Ensure dependencies are installed
npm install

# Start dev server
npm run dev
```

### 2. Add Schema Field

Edit `src/content/config.ts` and add `aiSummary: z.string().default("")` to the project schema.

### 3. Create AISummary Component

Create `src/components/AISummary.astro` with the code snippet above.

### 4. Update Project Data

Add `"aiSummary": ""` to all existing project JSON files.

### 5. Test

```bash
# Type check
npm run astro check

# Build
npm run build

# Preview
npm run preview
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| summary | string | (required) | The AI summary text (markdown supported) |
| maxChars | number | 300 | Character count threshold for truncation |

## Styling Customization

The summary uses Tailwind CSS classes. To customize:

```astro
<!-- Change background color -->
class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500"

<!-- Change spacing -->
class="p-6 my-6"

<!-- Change border style -->
class="border-2 border-blue-500 rounded-lg"
```

## Accessibility

The component includes:
- `role="region"` - Identifies the summary as a landmark
- `aria-label="AI 요약"` - Describes the region for screen readers
- Semantic HTML (`section`, `h2`)
- Sufficient color contrast (blue-500 on white/light backgrounds)

## Testing Checklist

- [ ] Summary displays when `aiSummary` has content
- [ ] Summary hidden when `aiSummary` is empty string
- [ ] Markdown renders correctly (bold, links, lists)
- [ ] Truncation works at 300+ characters
- [ ] Expand/collapse button functions
- [ ] ARIA labels present in DOM
- [ ] Mobile responsive (tested at 375px width)
- [ ] Dark mode styling works

## Troubleshooting

### Summary Not Displaying

**Issue**: AI summary section doesn't appear.

**Check**:
1. `aiSummary` field exists in JSON file
2. Field is not empty string or whitespace-only
3. Schema updated and type checking passes

### Markdown Not Rendering

**Issue**: Markdown shows as raw text.

**Solution**: Ensure you're using Astro's `<slot />` or `<Markdown />` component, not direct variable interpolation.

### Type Errors

**Issue**: TypeScript errors about `aiSummary` property.

**Solution**:
1. Run `npm run astro check` to rebuild types
2. Restart dev server
3. Check `src/content/config.ts` schema definition

## Related Files

- [spec.md](./spec.md) - Feature specification
- [data-model.md](./data-model.md) - Data model details
- [research.md](./research.md) - Technical decisions
- [plan.md](./plan.md) - Implementation plan

## Next Steps

After implementing this feature:

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement tasks in order
3. Test locally with `npm run dev`
4. Create pull request
5. Verify against acceptance criteria in spec.md
