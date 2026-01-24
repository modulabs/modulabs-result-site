# API Contract: 모두의연구소 LAB 결과물 사이트

**Feature**: 001-lab-results-site
**Date**: 2026-01-14

## Overview

이 사이트는 정적 사이트이므로 전통적인 백엔드 API가 없습니다. 대신 Content Collections를 통해 데이터에 접근하고, 클라이언트 사이드에서 필터링/검색을 수행합니다.

## Data Access Contract

### `getProjects()`

모든 공개 프로젝트를 가져옵니다.

**Returns**: `Project[]`

```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  abstract?: string;
  type: 'github' | 'paper';
  createdAt: string; // ISO date
  updatedAt?: string;
  authors: string[];
  tags?: string[];
  thumbnail?: string;
  published: boolean;
  links?: {
    github?: string;
    demo?: string;
    pdf?: string;
    arxiv?: string;
    projectPage?: string;
  };
  media?: {
    teaserVideo?: VideoObject | string;
    images?: string[];
    posterPdf?: string;
  };
  paper?: {
    venue?: string;
    year?: number;
    citation?: string;
    bibtex?: string;
  };
}

interface VideoObject {
  type: 'youtube' | 'file';
  url: string;
  thumbnail?: string;
}
```

**Example Usage**:
```typescript
import { getCollection } from 'astro:content';

const projects = await getCollection('projects');
const publishedProjects = projects
  .filter(p => p.data.published)
  .sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
```

### `getProjectById(id: string)`

ID로 특정 프로젝트를 가져옵니다.

**Parameters**:
- `id`: string - 프로젝트 ID

**Returns**: `Project | null`

**Example Usage**:
```typescript
import { getCollection } from 'astro:content';

const projects = await getCollection('projects');
const project = projects.find(p => p.id === id) ?? null;
```

## Filtering Contract

### `filterByType(projects: Project[], type: ProjectType)`

프로젝트를 타입으로 필터링합니다.

**Parameters**:
- `projects`: Project[] - 필터링할 프로젝트 목록
- `type`: 'github' | 'paper' - 필터링할 타입

**Returns**: `Project[]`

### `searchProjects(projects: Project[], query: string)`

프로젝트를 검색어로 검색합니다.

**Parameters**:
- `projects`: Project[] - 검색할 프로젝트 목록
- `query`: string - 검색어 (제목, 설명, 태그, 저자 검색)

**Returns**: `Project[]`

**Search Logic**:
- 제목 (title) 부분 일치
- 설명 (description) 부분 일치
- 태그 (tags) 정확히 일치
- 저자 (authors) 부분 일치
- 대소문자 구분 없음

## URL Routes Contract

### `GET /`

메인 페이지 - 모든 프로젝트 목록 표시

**Query Parameters**:
- `type`: 'github' | 'paper' | 'all' (default: 'all')
- `q`: string - 검색어

**Example**: `/?type=github&q=vision`

### `GET /projects/[id]`

프로젝트 상세 페이지

**Parameters**:
- `id`: string - 프로젝트 ID

**Example**: `/projects/probex`

## Component Contract

### `<ProjectCard project={Project} />`

프로젝트 카드 컴포넌트

**Props**:
```typescript
interface ProjectCardProps {
  project: Project;
}
```

**Renders**:
- 썸네일 이미지
- 타입 아이콘 (GitHub/Paper)
- 제목
- 설명
- 생성일
- 태그

**Interaction**:
- 클릭 시 `/projects/[id]`로 이동

### `<ProjectDetail project={Project} />`

프로젝트 상세 컴포넌트

**Props**:
```typescript
interface ProjectDetailProps {
  project: Project;
}
```

**Renders**:
- 제목, 저자
- Abstract/설명
- 티저 비디오 (있는 경우)
- 이미지 캐러셀 (있는 경우)
- PDF 포스터 뷰어 (있는 경우)
- 링크 버튼들
- BibTeX 복사 버튼 (논문인 경우)
- 소셜 공유 버튼

### `<FilterBar onTypeChange={fn} onSearch={fn} />`

필터바 컴포넌트

**Props**:
```typescript
interface FilterBarProps {
  currentType: 'all' | 'github' | 'paper';
  onTypeChange: (type: 'all' | 'github' | 'paper') => void;
  onSearch: (query: string) => void;
}
```

**Renders**:
- 타입 필터 버튼들 (All, GitHub, Paper)
- 검색 입력 필드

## Social Share Contract

### `shareToSocialMedia(platform: string, url: string, title: string)`

소셜 미디어 공유 다이얼로그를 엽니다.

**Parameters**:
- `platform`: 'twitter' | 'facebook' | 'linkedin' | 'copy'
- `url`: string - 공유할 URL
- `title`: string - 공유할 제목

**Returns**: `void`

**Implementation**:
```typescript
function shareToSocialMedia(platform: string, url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const urls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  if (platform === 'copy') {
    navigator.clipboard.writeText(url);
  } else {
    window.open(urls[platform], '_blank', 'width=600,height=400');
  }
}
```

### `copyBibTeX(bibtex: string)`

BibTeX을 클립보드에 복사합니다.

**Parameters**:
- `bibtex`: string - BibTeX 형식 텍스트

**Returns**: `Promise<boolean>` - 성공 여부

**Implementation**:
```typescript
async function copyBibTeX(bibtex: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(bibtex);
    return true;
  } catch {
    return false;
  }
}
```

## Image Optimization Contract

### `<Image {...props} />`

Astro Image 컴포넌트를 사용한 이미지 최적화

**Props**:
```typescript
interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}
```

**Behavior**:
- 자동 포맷 변환 (WebP/AVIF)
- 반응형 srcset 생성
- Lazy loading 기본

## Error States Contract

### Empty State

프로젝트가 없을 때 표시

**Component**: `<EmptyState />`

**Props**:
```typescript
interface EmptyStateProps {
  message: string;
}
```

### Error State

에러 발생 시 표시

**Component**: `<ErrorState />`

**Props**:
```typescript
interface ErrorStateProps {
  title: string;
  message: string;
}
```

## Performance Contract

### Initial Load
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3s

### Navigation
- 페이지 전환: < 100ms (View Transitions API 사용)

### Search/Filter
- 필터링 응답: < 50ms
- 검색 응답: < 100ms

## Accessibility Contract

### Keyboard Navigation
- Tab: 포커스 이동
- Enter/Space: 버튼/링크 활성화
- Escape: 모달/드롭다운 닫기

### ARIA Labels
- 모든 대화형 요소에 `aria-label` 제공
- 라이브 리징 요소에 `aria-live` 영역

### Focus Management
- 페이지 전환 후 포커스 유지
- 모달 닫기 후 포커스 복원

## SEO Contract

### Meta Tags

각 프로젝트 상세 페이지:

```html
<title>{project.title} | 모두의연구소 LAB</title>
<meta name="description" content={project.description} />

<!-- Open Graph -->
<meta property="og:title" content={project.title} />
<meta property="og:description" content={project.description} />
<meta property="og:image" content={project.thumbnail} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonicalUrl} />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={project.title} />
<meta name="twitter:description" content={project.description} />
<meta name="twitter:image" content={project.thumbnail} />

<!-- Canonical -->
<link rel="canonical" href={canonicalUrl} />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode" | "ScholarlyArticle",
  "name": "{project.title}",
  "description": "{project.description}",
  "author": "{project.authors}",
  "datePublished": "{project.createdAt}",
  "url": "{canonicalUrl}"
}
```

## Sitemap Contract

자동 생성되는 사이트맵:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://modulabs.kr/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://modulabs.kr/projects/probex</loc>
    <priority>0.8</priority>
    <lastmod>2024-03-15</lastmod>
  </url>
</urlset>
```
