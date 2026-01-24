# Data Model: AI 요약 기능 추가

**Feature**: AI 요약 기능 (001-ai-summary)
**Date**: 2026-01-14
**Status**: Complete

## Overview

This document describes the data model changes for the AI summary feature. The feature adds a single field to the existing Project entity without introducing new entities.

## Entity: Project (Extension)

The existing Project entity is extended with an `aiSummary` field.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| aiSummary | string | Yes | "" | AI-generated summary of the project. Empty string indicates no summary available. |

### Field Details: aiSummary

```typescript
// Zod schema definition
aiSummary: z.string().default("")
```

**Constraints**:
- Type: string
- Required: Yes (but empty string allowed)
- Default value: "" (empty string)
- Max length: No hard limit (practical limit ~500-1000 characters for UX)
- Character set: UTF-8 (supports Korean, emojis, special characters)
- Format: Markdown (optional formatting supported)

**Validation Rules**:
1. Must be a string type
2. Empty string ("") is valid (indicates no summary)
3. Whitespace-only strings should be treated as empty
4. Character count includes spaces and punctuation (for truncation logic)

**Display Logic**:
```
if (aiSummary.trim() === "") {
  // Don't render AI summary section
} else {
  // Render AI summary section with truncation if > 300 characters
}
```

## Zod Schema Update

### Before (Existing Schema)

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const project = defineCollection({
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(['github', 'paper']),
    createdAt: z.date(),
    authors: z.array(z.string()),
    published: z.boolean(),
    // ... other fields
  }),
});
```

### After (Updated Schema)

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const project = defineCollection({
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(['github', 'paper']),
    createdAt: z.date(),
    authors: z.array(z.string()),
    published: z.boolean(),
    aiSummary: z.string().default(""),  // NEW FIELD
    // ... other fields
  }),
});
```

## Example Data

### Example 1: Project with AI Summary

```json
{
  "id": "project-001",
  "title": "딥러닝을 활용한 이미지 분류 모델",
  "description": "CNN 기반의 이미지 분류 모델을 학습시켜...",
  "type": "github",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "authors": ["홍길동", "김철수"],
  "published": true,
  "aiSummary": "이 프로젝트는 CNN(Convolutional Neural Network)를 사용하여 이미지를 10개의 클래스로 분류하는 딥러닝 모델입니다. TensorFlow를 기반으로 구현되었으며, CIFAR-10 데이터셋에서 약 92%의 정확도를 달성했습니다. 주요 특징으로는 데이터 증강 기법, 드롭아웃 정규화, 학습률 스케줄링이 포함됩니다."
}
```

### Example 2: Project without AI Summary

```json
{
  "id": "project-002",
  "title": "자연어 처리를 위한 트랜스포머 모델",
  "description": "BERT 기반의 한국어 문장 분류 모델...",
  "type": "paper",
  "createdAt": "2024-02-01T09:00:00.000Z",
  "authors": ["이영희"],
  "published": true,
  "aiSummary": ""
}
```

## Type Definitions

### TypeScript Interface

```typescript
// Auto-generated from Zod schema by Astro
interface Project {
  id: string;
  title: string;
  description: string;
  type: 'github' | 'paper';
  createdAt: Date;
  authors: string[];
  published: boolean;
  aiSummary: string;  // NEW FIELD
  // ... other fields
}
```

## Component Props Interface

```typescript
// src/components/AISummary.astro
interface Props {
  summary: string;
  maxChars?: number;
}

// Default maxChars: 300
```

## State Transitions

The `aiSummary` field does not have state transitions. It is a static value that can be updated by:

1. **Admin Action**: Direct JSON file modification
2. **Future Enhancement**: Admin interface (out of scope for this feature)

## Relationships

No new relationships are created. The `aiSummary` field is a direct property of the Project entity.

## Migration Strategy

### Phase 1: Schema Update
1. Update `src/content/config.ts` to add `aiSummary` field
2. Run `npm run astro check` to verify type safety

### Phase 2: Data Migration
1. Add `"aiSummary": ""` to all existing project JSON files
2. Use default value for any files without the field

### Migration Script (Optional)

```bash
# Example: Add aiSummary field to all project JSON files
for file in src/content/projects/*.json; do
  # Use jq to add the field if not present
  jq '. + {aiSummary: .aiSummary // ""}' "$file" > tmp.json && mv tmp.json "$file"
done
```

## Indexing Considerations

No indexing required for this feature. The field is:
- Not used for filtering (only display)
- Not used for sorting (uses `createdAt` from parent spec)
- Not searchable in Phase 1 (could be added later)

## Data Access Patterns

### Reading Summary (Display Component)

```typescript
// In ProjectDetail.astro
const { project } = Astro.props;
const hasSummary = project.data.aiSummary?.trim().length > 0;
```

### Character Count Utility

```typescript
// In lib/utils.ts
export function getCharacterCount(text: string): number {
  return text.length;
}

export function shouldTruncate(text: string, threshold: number = 300): boolean {
  return getCharacterCount(text) > threshold;
}
```

## Validation Summary

| Rule | Implementation |
|------|----------------|
| Required field | Zod `.default("")` ensures field exists |
| Type safety | `z.string()` enforces string type |
| Empty handling | `.trim().length > 0` check for display |
| Markdown support | No validation (renderer handles) |
| Character limit | No DB limit, UI truncates at 300 |
