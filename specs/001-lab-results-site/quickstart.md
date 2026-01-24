# Quickstart Guide: 모두의연구소 LAB 결과물 사이트

**Feature**: 001-lab-results-site
**Date**: 2026-01-14

## Prerequisites

- Node.js 18.x or higher
- npm or yarn or pnpm
- Git

## Project Setup

### 1. Create Astro Project

```bash
npm create astro@latest modulabs-result-site
cd modulabs-result-site
```

선택사항:
```
? How would you like to start your new project?
  ❯ Include sample files
    "Empty" project

? Install dependencies?
  Yes

? Initialize a new git repository?
  Yes
```

### 2. Install Dependencies

```bash
npx astro add react tailwind
npm install
```

### 3. Create Content Collection

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
});
```

`src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';

const project = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    abstract: z.string().optional(),
    type: z.enum(['github', 'paper']),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    authors: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    published: z.boolean(),
    links: z.object({
      github: z.string().optional(),
      demo: z.string().optional(),
      pdf: z.string().optional(),
      arxiv: z.string().optional(),
      projectPage: z.string().optional(),
    }).optional(),
    media: z.object({
      teaserVideo: z.union([z.string(), z.object({
        type: z.enum(['youtube', 'file']),
        url: z.string(),
        thumbnail: z.string().optional(),
      })]).optional(),
      images: z.array(z.string()).optional(),
      posterPdf: z.string().optional(),
    }).optional(),
    paper: z.object({
      venue: z.string().optional(),
      year: z.number().optional(),
      citation: z.string().optional(),
      bibtex: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { project };
```

### 4. Create Directory Structure

```bash
mkdir -p src/content/projects
mkdir -p src/components
mkdir -p src/layouts
mkdir -p src/pages/projects
mkdir -p public/images
mkdir -p public/papers
```

## File Structure

```
src/
├── components/
│   ├── ProjectCard.astro       # 프로젝트 카드
│   ├── ProjectDetail.astro     # 프로젝트 상세
│   ├── FilterBar.astro         # 필터바
│   ├── EmptyState.astro        # 빈 상태
│   └── VideoPlayer.astro       # 비디오 플레이어
├── content/
│   ├── config.ts               # Content Collections 설정
│   └── projects/
│       ├── probex.json         # 프로젝트 데이터들
│       └── ...
├── layouts/
│   └── Layout.astro            # 기본 레이아웃
├── pages/
│   ├── index.astro             # 메인 페이지
│   └── projects/
│       └── [id].astro          # 상세 페이지
└── styles/
    └── global.css              # 전역 스타일
public/
├── images/                     # 이미지 파일들
└── papers/                     # PDF 파일들
```

## Development

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 프리뷰
npm run preview
```

## Adding a New Project

`src/content/projects/your-project.json`:
```json
{
  "id": "your-project",
  "title": "Your Project Title",
  "description": "Short description for card",
  "abstract": "Long description for detail page",
  "type": "github",
  "createdAt": "2024-01-15T00:00:00Z",
  "authors": ["Author One", "Author Two"],
  "tags": ["tag1", "tag2"],
  "thumbnail": "/images/your-project-thumb.jpg",
  "published": true,
  "links": {
    "github": "https://github.com/your-org/your-project"
  },
  "media": {
    "teaserVideo": {
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=xxxxx"
    },
    "images": [
      "/images/your-project-fig1.jpg"
    ]
  }
}
```

## Deployment (GitHub Pages)

### 1. GitHub Actions Workflow

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 2. Astro Config Update

`astro.config.mjs`:
```js
export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/repo-name',
  integrations: [react(), tailwind()],
});
```

### 3. Enable GitHub Pages

1. Repository → Settings → Pages
2. Source: GitHub Actions
3. Save

## Environment Variables (Optional)

`.env`:
```env
# Analytics
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Site Configuration
PUBLIC_SITE_URL=https://modulabs.kr
PUBLIC_SITE_NAME=모두의연구소 LAB
```

## Testing

```bash
# Install test dependencies
npm install --save-dev @playwright/test

# Run tests
npm run test
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on http://localhost:4321 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run astro check` | Type checking |
| `npm run astro add` | Add integrations |

## Troubleshooting

### Build Fails
- Check TypeScript errors: `npm run astro check`
- Clear cache: `rm -rf .astro node_modules && npm install`

### Images Not Loading
- Ensure images are in `public/` directory
- Check path: `/images/file.jpg` not `images/file.jpg`

### Styling Issues
- Restart dev server after adding Tailwind classes
- Check `tailwind.config.mjs` content paths

## Next Steps

1. Add sample project data
2. Customize design (colors, fonts)
3. Add analytics
4. Set up deployment
5. Test accessibility

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [React Integration](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
