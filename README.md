# Modulabs Result Site (모두의연구소 LAB 결과물 아카이브)

**모두의연구소 LAB 결과물** 사이트는 연구실에서 생산된 다양한 산출물(논문, GitHub 프로젝트, 영상 등)을 모아 보여주는 아카이브 플랫폼입니다. Next.js를 기반으로 제작되었으며, 관리자 페이지를 통해 결과물을 손쉽게 관리할 수 있습니다.

## ✨ 주요 기능

- **🗂️ 프로젝트 아카이빙:** 논문(Paper), 코드(GitHub), 영상(Video/YouTube) 등 다양한 형태의 결과물을 등록하고 분류하여 보여줍니다.
- **🔍 상세 페이지 자동 생성:** Markdown 파일 기반으로 프로젝트 상세 페이지를 생성하며, AI(Gemini)를 활용하여 논문 PDF나 URL로부터 콘텐츠를 자동 요약/생성할 수 있습니다.
- **🛠️ 관리자 모드 (Admin):**
    - 인증된 사용자만 접근 가능한 관리자 대시보드 제공
    - 새로운 프로젝트 생성, 수정, 비공개 처리 가능
    - **GitHub CMS 연동:** 관리자 페이지에서의 변경 사항이 GitHub 리포지토리에 자동으로 커밋되어, Vercel과 같은 Serverless 환경에서도 데이터 영속성을 보장합니다.
- **📊 통계 대시보드:** 메인 페이지에서 연도별 결과물, 타입별(GitHub repo, Paper, YouTube) 통계를 한눈에 볼 수 있습니다.
- **📈 Google Analytics 4 (GA4):** 사용자 트래킹을 위한 GA4가 연동되어 있습니다.

## 🚀 기술 스택

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Source:** Markdown Files (File System / GitHub API)
- **Deployment:** Vercel Optimized
- **AI:** Google Gemini Pro (콘텐츠 자동 생성용)
- **Analytics:** Google Analytics 4 (@next/third-parties)

## 📦 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/modulabs-result-site.git
cd modulabs-result-site
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 값을 입력하세요. (참고: `.env.example`)

```bash
# 인증 및 보안
ADMIN_PASSWORD=your_secure_password # 관리자 페이지 접속 비밀번호

# GitHub CMS 연동 (Vercel 배포 및 관리자 저장 기능 필수)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxx  # 'repo' 권한이 있는 GitHub Token
GITHUB_OWNER=your_github_username
GITHUB_REPO=modulabs-result-site
GITHUB_BRANCH=main

# Google Gemini API (AI 요약 기능용)
GEMINI_API_KEY=your_gemini_api_key

# Google Analytics 4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하여 확인합니다.

## ☁️ 배포 (Deployment)

이 프로젝트는 **Vercel** 배포에 최적화되어 있습니다.

1. GitHub 리포지토리에 코드를 Push합니다.
2. Vercel 대시보드에서 `New Project`를 클릭하고 리포지토리를 불러옵니다.
3. **Environment Variables** 설정에서 위 환경 변수들을 모두 입력합니다.
4. `Deploy` 버튼을 클릭하면 배포가 완료됩니다.

## 📂 프로젝트 구조

```
src/
├── app/                 # Next.js App Router 페이지
│   ├── admin/           # 관리자 페이지
│   ├── api/             # API Routes (GitHub 연동, AI 생성 등)
│   └── projects/[id]/   # 프로젝트 상세 페이지
├── components/          # 재사용 가능한 UI 컴포넌트
├── content/projects/    # 프로젝트 데이터 (Markdown 파일들)
├── lib/                 # 유틸리티 함수 (GitHub API, Markdown 파서 등)
└── styles/              # 전역 스타일
```

## 📝 관리자 모드 사용법

1. `/admin/login` 경로로 접속하여 설정한 비밀번호로 로그인합니다.
2. **프로젝트 관리 탭:** 기존 프로젝트의 공개/비공개 여부, 타입(GitHub/Paper/Video)을 수정합니다. (수정 시 GitHub에 자동 커밋됨)
3. **서브 페이지 생성 탭:** PDF 파일이나 URL을 입력하면 AI가 내용을 분석하여 자동으로 상세 페이지 초안을 생성해 줍니다.
