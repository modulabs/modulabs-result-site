# Research: 모두의연구소 LAB 결과물 사이트

**Feature**: 001-lab-results-site
**Date**: 2026-01-14
**Status**: Complete

## Overview

이 문서는 모두의연구소 LAB 결과물 전시 사이트를 구축하기 위한 기술적 연구 결과를 담고 있습니다. Academic Project Page Template 스타일의 정적 웹사이트를 구축하고, GitHub 저장소와 논문 결과물을 표시하는 것이 핵심 목표입니다.

## Technology Decisions

### 1. 웹 프레임워크 선택

**Decision**: Astro + React

**Rationale**:
- Astro는 콘텐츠 중심 웹사이트에 최적화된 정적 사이트 생성기
- Zero JS by default 기본 설정으로 빠른 초기 로딩 가능
- React 컴포넌트 필요시 선택적으로 추가 가능
- Markdown/MDX 지원으로 결과물 데이터 관리 용이
- 이미지 최적화 내장

**Alternatives considered**:
- **Next.js**: 더 무겁고, 서버 컴포넌트 학습 곡선 존재
- **Vite + Vanilla React**: 빌드 최적화 직접 필요
- **Hugo**: 템플릿 작성이 덜 직관적임

### 2. 스타일링 솔루션

**Decision**: Tailwind CSS

**Rationale**:
- Academic Project Page Template와 유사한 디자인 빠르게 구현 가능
- 반응형 디자인 기본 내장
- Dark mode 지원 용이
- 커스텀 디자인 시스템 구축 가능

**Alternatives considered**:
- **CSS Modules**: 더 많은 보일러플레이트 필요
- **Styled Components**: 런타임 오버헤드

### 3. 데이터 관리

**Decision**: JSON 파일 + Content Collections

**Rationale**:
- spec에 명시된 대로 JSON 형식으로 결과물 데이터 관리
- Astro의 Content Collections로 타입 안전성 확보
- Git으로 버전 관리 가능
- 수동 관리 용이 (assumption과 일치)

**Data Schema**:
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "type": "github" | "paper",
  "createdAt": "ISO date",
  "authors": ["string"],
  "links": {
    "github": "string | null",
    "pdf": "string | null",
    "arxiv": "string | null"
  },
  "media": {
    "teaserVideo": "string | null",
    "images": ["string"],
    "posterPdf": "string | null"
  },
  "bibtex": "string | null",
  "tags": ["string"]
}
```

### 4. 정적 자원 호스팅

**Decision**: GitHub Pages

**Rationale**:
- 무료이며 GitHub 저장소와 직접 연동
- 자동 HTTPS
- CI/CD를 통한 자동 배포 가능

**Alternatives considered**:
- **Vercel**: 더 빠른 빌드지만 추가 계정 필요
- **Netlify**: GitHub Pages와 유사

### 5. 라우팅 구조

**Decision**: 파일 기반 라우팅 (File-based routing)

**Rationale**:
- Astro의 파일 기반 라우팅 활용
- `/` - 메인 페이지 (결과물 목록)
- `/projects/[id]` - 결과물 상세 페이지

### 6. 검색 및 필터링

**Decision**: 클라이언트 사이드 필터링

**Rationale**:
- 결과물 수가 많지 않은 경우 (초기에는 수십 개 예상)
- 서버리스 정적 호스팅에 적합
- Alpine.js 또는 React useState로 간단히 구현

## Performance Considerations

### 이미지 최적화
- Astro 내장 Image 컴포넌트 사용
- Lazy loading 적용
- WebP/AVIF 형식 변환
- 반응형 srcset 생성

### 코드 분할
- 페이지별로 필요한 컴포넌트만 로드
- 동적 import for heavy components (video player, PDF viewer)

### 캐싱 전략
- 정적 자산에 긴 cache-header 설정
- ETag 지원

## SEO 및 메타데이터

### Open Graph Tags
- 각 결과물 상세 페이지에 OG 태그 포함
- Twitter Card 지원
- 구조화된 데이터 (JSON-LD) for Schema.org

### Sitemap & Robots
- 자동 sitemap.xml 생성
- robots.txt 설정

## Accessibility

- WCAG 2.1 AA 준수 목표
- 키보드 내비게이션 지원
- 스크린 리더 호환
- 적절한 ARIA 라벨

## Mobile Support

- 반응형 디자인 (mobile-first 접근)
- 터치 타겟 최소 44x44px
- 모바일에서 비디오 자동 재생 금지

## Error Handling

### 대체 상태
- 결과물 없음: 빈 상태 UI
- 링크 실패: graceful degradation
- 이미지 로드 실패: 플레이스홀더

## Build & Deployment

### 개발 환경
```bash
npm create astro@latest
npm install
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
# 출력: dist/
```

### 배포
- GitHub Actions로 자동 배포
- PR별 preview 배포

## Third-Party Integrations

### BibTeX 복사
- Clipboard API 사용
- Fallback for older browsers

### 소셜 공유
- Web Share API (모바일)
- Fallback: 링크 복사 버튼

### GitHub 저장소 정보
- 정적 데이터로 관리 (실시간 API 호출 없음)
- spec assumption에 따라 수동 관리

## Summary

| 카테고리 | 선택 |
|----------|------|
| 프레임워크 | Astro + React |
| 스타일링 | Tailwind CSS |
| 데이터 관리 | JSON + Content Collections |
| 호스팅 | GitHub Pages |
| 검색/필터링 | 클라이언트 사이드 |
| 이미지 최적화 | Astro Image 컴포넌트 |
| 배포 | GitHub Actions |

모든 기술적 결정이 spec의 assumptions과 success criteria를 충족합니다.
