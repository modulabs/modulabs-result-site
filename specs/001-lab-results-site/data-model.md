# Data Model: 모두의연구소 LAB 결과물 사이트

**Feature**: 001-lab-results-site
**Date**: 2026-01-14

## Overview

이 문서는 LAB 결과물 사이트의 데이터 모델을 정의합니다. 모든 데이터는 JSON 파일로 관리되며, Astro Content Collections을 통해 타입 안전성을 확보합니다.

## Entities

### Project (결과물)

메인 엔티티로, GitHub 저장소 또는 논문 형태의 LAB 결과물을 나타냅니다.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | 고유 식별자 (URL-safe, e.g., "probex", "spectral-detuning") |
| `title` | string | Yes | 결과물 제목 |
| `description` | string | Yes | 짧은 설명 (카드에 표시) |
| `abstract` | string | No | 상세 설명 (상세 페이지에 표시) |
| `type` | enum | Yes | `"github"` 또는 `"paper"` |
| `createdAt` | ISO date | Yes | 생성일 (정렬용) |
| `updatedAt` | ISO date | No | 최종 수정일 |
| `authors` | string[] | Yes | 저자/작성자 목록 |
| `tags` | string[] | No | 카테고리/태그 |
| `thumbnail` | string | No | 썸네일 이미지 경로 |
| `published` | boolean | Yes | 공개 여부 (초안용) |

#### Links (type에 따라 선택적)

| Field | Type | Required When | Description |
|-------|------|---------------|-------------|
| `links.github` | string | type="github" | GitHub 저장소 URL |
| `links.demo` | string | No | 데모 링크 |
| `links.pdf` | string | type="paper" | 논문 PDF URL |
| `links.arxiv` | string | type="paper" | arXiv URL |
| `links.projectPage` | string | No | 프로젝트 페이지 URL |

#### Media (선택적)

| Field | Type | Description |
|-------|------|-------------|
| `media.teaserVideo` | string \| VideoObject | 티저 비디오 (YouTube URL 또는 로컬 파일) |
| `media.images` | string[] | 프로젝트 이미지 경로들 |
| `media.posterPdf` | string | 포스터 PDF 경로 |

#### VideoObject (비디오 상세)

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | `"youtube"` 또는 `"file"` |
| `url` | string | YouTube URL 또는 파일 경로 |
| `thumbnail` | string | 비디오 썸네일 |

#### Paper Specifics (논문 추가 정보)

| Field | Type | Required When | Description |
|-------|------|---------------|-------------|
| `paper.venue` | string | type="paper" | 발표 회의/저널 |
| `paper.year` | number | type="paper" | 발표 연도 |
| `paper.citation` | string | type="paper" | 인용 텍스트 |
| `paper.bibtex` | string | type="paper" | BibTeX 형식 |

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Project                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌──────────┐    ┌─────────────┐          │
│   │  Draft  │───▶│ Published│───▶│  Archived   │          │
│   │(unpublished) │   │     │            │          │
│   └─────────┘    └──────────┘    └─────────────┘          │
│                                                             │
│   Type: github ───────────────────────────────────────┐     │
│   Type: paper ──────────────────────────────────────┐ │     │
│                                                     │ │     │
└─────────────────────────────────────────────────────┘ │ │
                                                      │ │     │
┌─────────────────────────────────────────────────────┘ │     │
│                                                     │       │
└─────────────────────────────────────────────────────┘       │
                                                              │
```

## Relationships

```
Project 1 ─── N Author
       │
       │
       ├─── 0..1 GitHubRepo
       │         └─── { url, description, language, stars }
       │
       ├─── 0..1 Paper
       │         └─── { venue, year, citation, bibtex }
       │
       ├─── 0..N Tag
       │         └─── { name }
       │
       └─── 0..N Media
                 └─── { teaserVideo, images[], posterPdf }
```

## Validation Rules

1. **ID**: URL-safe 문자만 허용, 중복 불가
2. **Type**: "github" 또는 "paper"만 허용
3. **CreatedAt**: 유효한 ISO 8601 날짜 형식
4. **Links**: type="github"일 때 links.github 필수
5. **Paper**: type="paper"일 때 paper.bibtex 필수
6. **Media URLs**: 존재하는 파일이거나 유효한 외부 URL

## Example: GitHub Repository

```json
{
  "id": "probex",
  "title": "ProbEx: Probabilistic Extrapolation",
  "description": "A novel approach for probabilistic extrapolation in computer vision tasks.",
  "abstract": "Long description...",
  "type": "github",
  "createdAt": "2024-03-15T00:00:00Z",
  "authors": ["John Doe", "Jane Smith"],
  "tags": ["computer-vision", "probabilistic"],
  "thumbnail": "/images/probex-thumb.jpg",
  "published": true,
  "links": {
    "github": "https://github.com/modulabs/probex",
    "demo": "https://probex.demo.modulabs.kr"
  },
  "media": {
    "teaserVideo": {
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "thumbnail": "/images/probex-video-thumb.jpg"
    },
    "images": [
      "/images/probex-fig1.jpg",
      "/images/probex-fig2.jpg"
    ]
  }
}
```

## Example: Paper

```json
{
  "id": "spectral-detuning",
  "title": "Spectral Detuning for Image Generation",
  "description": "A method for spectral detuning in diffusion models.",
  "abstract": "Long description...",
  "type": "paper",
  "createdAt": "2024-06-20T00:00:00Z",
  "authors": ["Alice Kim", "Bob Lee"],
  "tags": ["diffusion-models", "image-generation"],
  "thumbnail": "/images/spectral-thumb.jpg",
  "published": true,
  "links": {
    "pdf": "https://arxiv.org/pdf/2406.xxxxx.pdf",
    "arxiv": "https://arxiv.org/abs/2406.xxxxx",
    "projectPage": "https://modulabs.kr/spectral-detuning"
  },
  "paper": {
    "venue": "CVPR 2024",
    "year": 2024,
    "citation": "Kim et al., Spectral Detuning for Image Generation, CVPR 2024",
    "bibtex": "@inproceedings{kim2024spectral,\n  title={Spectral Detuning for Image Generation},\n  author={Kim, Alice and Lee, Bob},\n  booktitle={CVPR},\n  year={2024}\n}"
  },
  "media": {
    "images": [
      "/images/spectral-teaser.jpg"
    ],
    "posterPdf": "/papers/spectral-poster.pdf"
  }
}
```

## File Structure

```
src/content/projects/
├── probex.json
├── spectral-detuning.json
├── mother.json
└── ...
```

## Indexing Strategy

클라이언트 사이드 필터링을 위해 모든 프로젝트 데이터를 한 번에 로드합니다:

1. 메인 페이지: 모든 published=true 프로젝트
2. 상세 페이지: ID로 개별 조회 (또는 전체 데이터에서 필터링)
3. 검색/필터: 로드된 데이터를 클라이언트에서 필터링

데이터 크기가 커지면 JSON 분할 또는 검색 인덱스를 고려할 수 있습니다.
