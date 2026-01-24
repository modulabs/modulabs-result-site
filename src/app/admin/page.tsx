'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import AcademicProjectPage to avoid SSR issues
const AcademicProjectPage = dynamic(
  () => import('@/components/templates/AcademicProjectPage').then((mod) => mod.default),
  { ssr: false }
);

type SourceType = 'pdf' | 'github' | 'youtube';
type TabType = 'projects' | 'subpages';

interface Author {
  name: string;
  url?: string;
  equalContribution?: boolean;
  affiliation?: string;
}

interface Link {
  type: 'paper' | 'code' | 'arxiv' | 'supplementary';
  url: string;
}

interface CarouselItem {
  type: 'image' | 'video';
  src: string;
  caption: string;
}

interface GeneratedData {
  projectId: string;
  title: string;
  authors: Author[];
  institution: string;
  venue: string;
  year: string;
  abstract: string;
  highlights?: string[];
  detailedDescription?: {
    problem?: string[];
    method?: string[];
    results?: string[];
  };
  links: Link[];
  teaserVideo?: string;
  carousel?: CarouselItem[];
  youtubeVideoId?: string;
  poster?: { pdfUrl?: string };
  bibtex?: { code: string };
  relatedWorks?: Array<{
    title: string;
    description: string;
    venue: string;
    url: string;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('subpages');
  const [selectedSource, setSelectedSource] = useState<SourceType>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [sourceUrl, setSourceUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authors, setAuthors] = useState('');
  const [authorList, setAuthorList] = useState<Array<{ name: string; affiliation: string }>>([]);
  const [venue, setVenue] = useState('');
  const [institution, setInstitution] = useState('');
  const [researchYear, setResearchYear] = useState(new Date().getFullYear().toString());
  const [showPreview, setShowPreview] = useState(false);
  const [pdfInputMode, setPdfInputMode] = useState<'url' | 'file'>('url');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  const handlePdfFileUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '파일 업로드 실패');
      }

      const result = await response.json();
      const fullUrl = `${window.location.origin}${result.url}`;
      setUploadedPdfUrl(fullUrl);
      return fullUrl;
    } catch (error: any) {
      throw new Error(error.message || '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">인증이 필요합니다.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  const handleGeneratePage = async () => {
    if (!projectId) {
      setError('프로젝트 ID를 입력해주세요.');
      return;
    }

    // Check source URL or file
    let finalSourceUrl = sourceUrl;
    if (selectedSource === 'pdf') {
      if (pdfInputMode === 'file') {
        if (!pdfFile) {
          setError('PDF 파일을 선택해주세요.');
          return;
        }
        // Upload file first
        try {
          finalSourceUrl = await handlePdfFileUpload(pdfFile);
        } catch (err: any) {
          setError(err.message || '파일 업로드에 실패했습니다.');
          return;
        }
      } else {
        if (!sourceUrl) {
          setError('PDF URL을 입력해주세요.');
          return;
        }
      }
    } else {
      if (!sourceUrl) {
        setError('소스 URL을 입력해주세요.');
        return;
      }
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedData(null);

    try {
      // Simulate progress
      setGenerationStatus('소스를 분석하고 있습니다...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setGenerationStatus('Gemini AI가 콘텐츠를 생성 중입니다...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setGenerationStatus('페이지 구조를 만드는 중입니다...');

      // Call actual API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: selectedSource,
          sourceUrl: finalSourceUrl,
          projectId,
          authors: authors || undefined,
          authorList: authorList.length > 0 ? authorList : undefined,
          venue: venue || undefined,
          institution: institution || undefined,
          researchYear: researchYear || new Date().getFullYear().toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '생성 실패');
      }

      const result = await response.json();
      setGeneratedData(result.data);
      setGenerationStatus('');
      setSuccessMessage(result.message || '페이지가 자동으로 생성되어 저장되었습니다!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || '생성 중 오류가 발생했습니다.');
      setGenerationStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMarkdown = () => {
    if (!generatedData) return;

    // Helper function to escape markdown special characters in image alt text
    const escapeMarkdownAlt = (text: string) => {
      return text
        .replace(/\[/g, '\\[')   // Escape [
        .replace(/\]/g, '\\]')   // Escape ]
        .replace(/"/g, '\\"');     // Escape "
    };

    // Create markdown content
    const authorsList = generatedData.authors
      .map((a) => (a.url ? `[${a.name}](${a.url})` : a.name))
      .join(', ');

    const linksMarkdown = generatedData.links
      .map((l) => {
        const labels = { paper: 'Paper', code: 'Code', arxiv: 'arXiv', supplementary: 'Supplementary' };
        return `- [${labels[l.type]}](${l.url})`;
      })
      .join('\n');

    const carouselMarkdown =
      generatedData.carousel && generatedData.carousel.length > 0
        ? generatedData.carousel
          .map((c) => `![${escapeMarkdownAlt(c.caption || 'image')}](${c.src})\n_${c.caption}_`)
          .join('\n\n')
        : '';

    const relatedWorksMarkdown =
      generatedData.relatedWorks && generatedData.relatedWorks.length > 0
        ? generatedData.relatedWorks
          .map((w) => `- [${w.title}](${w.url}) - ${w.description} (${w.venue})`)
          .join('\n')
        : '';

    const highlightsMarkdown =
      generatedData.highlights && generatedData.highlights.length > 0
        ? `\n## 주요 기여점\n\n${generatedData.highlights.map((h) => `- ${h}`).join('\n')}\n`
        : '';

    const detailedDescriptionMarkdown =
      generatedData.detailedDescription
        ? (() => {
          let md = '\n## 상세 설명\n\n';
          if (generatedData.detailedDescription.problem && generatedData.detailedDescription.problem.length > 0) {
            md += '### 문제 정의\n\n';
            md += generatedData.detailedDescription.problem.map((p) => `- ${p}`).join('\n') + '\n\n';
          }
          if (generatedData.detailedDescription.method && generatedData.detailedDescription.method.length > 0) {
            md += '### 제안 방법\n\n';
            md += generatedData.detailedDescription.method.map((m) => `- ${m}`).join('\n') + '\n\n';
          }
          if (generatedData.detailedDescription.results && generatedData.detailedDescription.results.length > 0) {
            md += '### 실험 결과\n\n';
            md += generatedData.detailedDescription.results.map((r) => `- ${r}`).join('\n') + '\n\n';
          }
          return md;
        })()
        : '';

    const markdown = `---
id: ${generatedData.projectId}
title: ${generatedData.title}
description: ${generatedData.abstract.substring(0, 100)}...
type: ${selectedSource === 'github' ? 'github' : 'paper'}
createdAt: ${new Date().toISOString().split('T')[0]}
authors: [${generatedData.authors.map((a) => `'${a.name}'`).join(', ')}]
published: true
venue: ${generatedData.venue}
year: ${generatedData.year}
institution: ${generatedData.institution}
${selectedSource === 'github' ? `githubUrl: ${sourceUrl}` : ''}
${selectedSource === 'pdf' ? `arxivUrl: ${sourceUrl}` : ''}
${generatedData.youtubeVideoId ? `youtubeVideoId: ${generatedData.youtubeVideoId}` : ''}
---

# ${generatedData.title}

**Authors:** ${authorsList}

**Institution:** ${generatedData.institution}

**Venue:** ${generatedData.venue} ${generatedData.year}

## Links

${linksMarkdown}

## Abstract

${generatedData.abstract}
${highlightsMarkdown}
${detailedDescriptionMarkdown}
${generatedData.teaserVideo ? `## Teaser Video\n\n[Watch Teaser](${generatedData.teaserVideo})\n` : ''}

${carouselMarkdown ? `## Results\n\n${carouselMarkdown}\n` : ''}

${generatedData.youtubeVideoId ? `## Video Presentation\n\n[![Video](https://img.youtube.com/vi/${generatedData.youtubeVideoId}/maxresdefault.jpg)](https://www.youtube.com/watch?v=${generatedData.youtubeVideoId})\n` : ''}

${generatedData.bibtex ? `## BibTeX\n\n\`\`\`bibtex\n${generatedData.bibtex.code}\n\`\`\`\n` : ''}

${relatedWorksMarkdown ? `## Related Works\n\n${relatedWorksMarkdown}\n` : ''}
`;

    // Download as file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedData.projectId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessMessage('마크다운 파일이 다운로드되었습니다!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 -mx-4">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg">모두의연구소</span>
              <span className="text-xs text-gray-400 block">LAB Admin</span>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'projects'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              프로젝트 관리
            </button>
            <button
              onClick={() => setActiveTab('subpages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'subpages'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              서브 페이지 생성
              <span className="ml-auto px-2 py-0.5 text-xs bg-gradient-to-r from-primary to-accent text-white rounded-full">
                AI
              </span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-800 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            사이트로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === 'projects' ? (
          <ProjectsTab />
        ) : (
          <SubpagesTab
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            isGenerating={isGenerating}
            generationStatus={generationStatus}
            onGenerate={handleGeneratePage}
            generatedData={generatedData}
            setGeneratedData={setGeneratedData}
            onSave={handleSaveMarkdown}
            error={error}
            setError={setError}
            successMessage={successMessage}
            setSuccessMessage={setSuccessMessage}
            // Form values
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            projectId={projectId}
            setProjectId={setProjectId}
            authors={authors}
            setAuthors={setAuthors}
            authorList={authorList}
            setAuthorList={setAuthorList}
            venue={venue}
            setVenue={setVenue}
            institution={institution}
            setInstitution={setInstitution}
            researchYear={researchYear}
            setResearchYear={setResearchYear}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            // PDF upload
            pdfInputMode={pdfInputMode}
            setPdfInputMode={setPdfInputMode}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            uploadedPdfUrl={uploadedPdfUrl}
            setUploadedPdfUrl={setUploadedPdfUrl}
            isUploading={isUploading}
            onFileSelect={handleFileSelect}
          />
        )}
      </main>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {successMessage}
        </div>
      )}
    </div>
  );
}

function ProjectsTab() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, published: !currentStatus } : p));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (!res.ok) {
        // Revert on failure
        setProjects(prev => prev.map(p => p.id === id ? { ...p, published: currentStatus } : p));
        alert('상태 업데이트에 실패했습니다.');
      }
    } catch (error) {
      // Revert on error
      setProjects(prev => prev.map(p => p.id === id ? { ...p, published: currentStatus } : p));
      console.error('Failed to update status', error);
      alert('오류가 발생했습니다.');
    }
  };

  const updateProjectType = async (id: string, newType: 'github' | 'paper' | 'video') => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, type: newType } : p));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      });

      if (!res.ok) {
        // Revert on failure
        fetchProjects();
        alert('타입 업데이트에 실패했습니다.');
      }
    } catch (error) {
      fetchProjects();
      console.error('Failed to update type', error);
      alert('오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>{error}</p>
        <button onClick={fetchProjects} className="mt-4 text-primary hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            프로젝트 관리
          </h1>
          <p className="text-gray-500">
            총 <span className="font-semibold text-gray-900">{projects.length}</span>개의 프로젝트
          </p>
        </div>
        <button
          onClick={fetchProjects}
          className="p-2 text-gray-400 hover:text-primary transition-colors"
          title="새로고침"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                프로젝트
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                타입
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  프로젝트가 없습니다.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${project.type === 'github' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-500'
                        }`}>
                        {project.type === 'github' ? (
                          <img src="/github-logo.svg" alt="GitHub" className="w-5 h-5" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">
                          {project.title}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {project.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={project.type}
                      onChange={(e) => updateProjectType(project.id, e.target.value as 'github' | 'paper' | 'video')}
                      className={`inline-flex items-center gap-1 pl-2 pr-8 py-1 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-primary cursor-pointer appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] ${project.type === 'github'
                        ? 'bg-gray-100 text-gray-800'
                        : project.type === 'video'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-red-50 text-red-700'
                        }`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      }}
                    >
                      <option value="github">GitHub</option>
                      <option value="paper">Paper</option>
                      <option value="video">Video</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublish(project.id, project.published)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${project.published ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      role="switch"
                      aria-checked={project.published}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${project.published ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                    <span className="ml-2 text-sm text-gray-500">
                      {project.published ? '공개' : '비공개'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      target="_blank"
                      className="text-gray-400 hover:text-primary transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SourceCardProps {
  type: SourceType;
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  description: string;
  iconColor: string;
  icon: React.ReactNode;
}

function SourceCard({
  type,
  selected,
  onClick,
  title,
  subtitle,
  description,
  iconColor,
  icon,
}: SourceCardProps) {
  return (
    <div
      onClick={onClick}
      className={`source-card bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all ${selected
        ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5'
        : 'border-transparent hover:border-gray-300'
        }`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected
            ? 'border-primary bg-primary'
            : 'border-gray-300'
            }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 4l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

interface SubpagesTabProps {
  selectedSource: SourceType;
  setSelectedSource: (source: SourceType) => void;
  isGenerating: boolean;
  generationStatus: string;
  onGenerate: () => void;
  generatedData: GeneratedData | null;
  setGeneratedData: (data: GeneratedData | null) => void;
  onSave: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
  projectId: string;
  setProjectId: (value: string) => void;
  authors: string;
  setAuthors: (value: string) => void;
  authorList: Array<{ name: string; affiliation: string }>;
  setAuthorList: (value: Array<{ name: string; affiliation: string }>) => void;
  venue: string;
  setVenue: (value: string) => void;
  institution: string;
  setInstitution: (value: string) => void;
  researchYear: string;
  setResearchYear: (value: string) => void;
  showPreview: boolean;
  setShowPreview: (value: boolean) => void;
  pdfInputMode: 'url' | 'file';
  setPdfInputMode: (value: 'url' | 'file') => void;
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  uploadedPdfUrl: string;
  setUploadedPdfUrl: (value: string) => void;
  isUploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function SubpagesTab({
  selectedSource,
  setSelectedSource,
  isGenerating,
  generationStatus,
  onGenerate,
  generatedData,
  setGeneratedData,
  onSave,
  error,
  setError,
  successMessage,
  setSuccessMessage,
  sourceUrl,
  setSourceUrl,
  projectId,
  setProjectId,
  authors,
  setAuthors,
  authorList,
  setAuthorList,
  venue,
  setVenue,
  institution,
  setInstitution,
  researchYear,
  setResearchYear,
  showPreview,
  setShowPreview,
  pdfInputMode,
  setPdfInputMode,
  pdfFile,
  setPdfFile,
  uploadedPdfUrl,
  setUploadedPdfUrl,
  isUploading,
  onFileSelect,
}: SubpagesTabProps) {
  const sourceConfigs = {
    pdf: {
      title: 'PDF 논문',
      subtitle: 'arXiv 또는 PDF 파일',
      description: '논문 PDF를 업로드하거나 arXiv URL을 입력하면 AI가 자동으로 요약하고 페이지를 생성합니다.',
      iconColor: 'bg-red-100',
      icon: (
        <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          <path
            d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      ),
      placeholder: 'https://arxiv.org/abs/2401.xxxxx',
    },
    github: {
      title: 'GitHub 저장소',
      subtitle: '오픈소스 프로젝트',
      description: 'GitHub 저장소 URL을 입력하면 README, 코드 구조를 분석하여 페이지를 생성합니다.',
      iconColor: 'bg-gray-100',
      icon: (
        <img src="/github-logo.svg" alt="GitHub" className="w-7 h-7" />
      ),
      placeholder: 'https://github.com/username/repo',
    },
    youtube: {
      title: 'YouTube 영상',
      subtitle: '영상 분석 기반',
      description: '데모, 시연, 튜토리얼 등 다양한 유형의 영상을 분석하여 프로젝트 페이지를 생성합니다.',
      iconColor: 'bg-red-100',
      icon: (
        <img src="/youtube-logo.png" alt="YouTube" className="w-7 h-7" />
      ),
      placeholder: 'https://www.youtube.com/watch?v=...',
    },
  };

  const labels = {
    pdf: 'PDF URL (arXiv)',
    github: 'GitHub 저장소 URL',
    youtube: 'YouTube 영상 URL',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI 서브 페이지 생성
        </h1>
        <p className="text-gray-500">
          Gemini API를 활용하여 PDF, GitHub, YouTube에서 프로젝트 페이지 자동 생성
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <div>
              <p className="font-medium text-red-800">오류</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Source Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(sourceConfigs) as SourceType[]).map((type) => (
          <SourceCard
            key={type}
            type={type}
            selected={selectedSource === type}
            onClick={() => setSelectedSource(type)}
            {...sourceConfigs[type]}
          />
        ))}
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          소스 정보 입력
        </h2>

        {/* PDF: URL or File selection */}
        {selectedSource === 'pdf' && (
          <div className="mb-6">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setPdfInputMode('url');
                  setPdfFile(null);
                  setUploadedPdfUrl('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${pdfInputMode === 'url'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                disabled={isGenerating}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                URL 입력
              </button>
              <button
                type="button"
                onClick={() => {
                  setPdfInputMode('file');
                  setSourceUrl('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${pdfInputMode === 'file'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                disabled={isGenerating}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                파일 업로드
              </button>
            </div>
          </div>
        )}

        {/* URL Input */}
        {selectedSource !== 'pdf' || pdfInputMode === 'url' ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labels[selectedSource]} *
            </label>
            <input
              type="text"
              placeholder={sourceConfigs[selectedSource].placeholder}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={isGenerating}
            />
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF 파일 업로드 * (최대 10MB)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={onFileSelect}
                className="hidden"
                id="pdf-file-input"
                disabled={isGenerating || isUploading}
              />
              <label
                htmlFor="pdf-file-input"
                className={`flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${pdfFile
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary bg-gray-50'
                  } ${isGenerating || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg
                  className={`w-8 h-8 ${pdfFile ? 'text-primary' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="text-left">
                  {pdfFile ? (
                    <div>
                      <p className="font-medium text-gray-900">{pdfFile.name}</p>
                      <p className="text-sm text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900">
                        {isUploading ? '업로드 중...' : '클릭하여 PDF 파일 선택'}
                      </p>
                      <p className="text-sm text-gray-500">또는 파일을 여기로 드래그</p>
                    </div>
                  )}
                </div>
              </label>
            </div>
            {pdfFile && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    setUploadedPdfUrl('');
                  }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                  disabled={isGenerating}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  파일 제거
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            프로젝트 ID *
          </label>
          <input
            type="text"
            placeholder="예: my-research-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            disabled={isGenerating}
          />
          <p className="mt-1 text-xs text-gray-500">
            URL에 사용될 영문 ID입니다 (소문자, 하이픈만 가능)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 저자 입력 (간단 모드) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              저자 (선택, 쉼표로 구분)
            </label>
            <input
              type="text"
              placeholder="홍길동, 김철수"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={isGenerating}
            />
            <p className="mt-1 text-xs text-gray-500">
              간단 입력 모드 - 소속이 같을 때 사용
            </p>
          </div>

          {/* 발표처 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발표처/저널 (선택)
            </label>
            <input
              type="text"
              placeholder="CVPR 2025"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* 저자별 소속 입력 (상세 모드) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              저자별 소속 (상세 모드)
            </label>
            <button
              type="button"
              onClick={() => setAuthorList([...authorList, { name: '', affiliation: '' }])}
              className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              disabled={isGenerating}
            >
              + 저자 추가
            </button>
          </div>

          {authorList.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
              저자별 소속을 입력하려면 &quot;+ 저자 추가&quot; 버튼을 클릭하세요
            </div>
          ) : (
            <div className="space-y-2">
              {authorList.map((author, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="저자명"
                    value={author.name}
                    onChange={(e) => {
                      const newList = [...authorList];
                      newList[idx].name = e.target.value;
                      setAuthorList(newList);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    disabled={isGenerating}
                  />
                  <span className="text-gray-400">@</span>
                  <input
                    type="text"
                    placeholder="소속 기관"
                    value={author.affiliation}
                    onChange={(e) => {
                      const newList = [...authorList];
                      newList[idx].affiliation = e.target.value;
                      setAuthorList(newList);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    disabled={isGenerating}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newList = authorList.filter((_, i) => i !== idx);
                      setAuthorList(newList);
                    }}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    disabled={isGenerating}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기관명 (공통) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            기관명 (선택, 공통)
          </label>
          <input
            type="text"
            placeholder="ModuLabs"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            disabled={isGenerating}
          />
          <p className="mt-1 text-xs text-gray-500">
            모든 저자의 소속이 같을 때 사용
          </p>
        </div>

        {/* 연구년도 */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            연구년도 *
          </label>
          <input
            type="number"
            placeholder="2024"
            value={researchYear}
            onChange={(e) => setResearchYear(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            disabled={isGenerating}
            min="2000"
            max="2099"
          />
          <p className="mt-1 text-xs text-gray-500">
            연구가 수행된 연도 (메인페이지에서 연도별 분류에 사용됨)
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-primary/25 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {generationStatus || '생성 중...'}
            </>
          ) : (
            <>
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              AI로 페이지 생성하기
            </>
          )}
        </button>
      </div>

      {/* Generated Result */}
      {generatedData && (
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">페이지 자동 생성 완료!</h3>
                <p className="text-sm text-gray-500">마크다운 파일이 자동으로 저장되었습니다. 메인 페이지에서 바로 확인하세요.</p>
              </div>
            </div>
            <Link
              href={`/projects/${generatedData.projectId}`}
              target="_blank"
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              페이지 보기
            </Link>
          </div>

          <div className="p-6">
            {/* Title */}
            <div className="mb-6">
              <h4 className="text-2xl font-bold text-gray-900 mb-2">
                {generatedData.title}
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {generatedData.authors && generatedData.authors.length > 0 && (
                  <span>{generatedData.authors.map((a) => a.name).join(', ')}</span>
                )}
                {generatedData.institution && <span>• {generatedData.institution}</span>}
                {generatedData.venue && <span>• {generatedData.venue}</span>}
                {generatedData.year && <span>• {generatedData.year}</span>}
              </div>
            </div>

            {/* Abstract Preview */}
            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 mb-2">초록</h5>
              <p className="text-gray-600 text-sm line-clamp-3">
                {generatedData.abstract}
              </p>
            </div>

            {/* Links Preview */}
            {generatedData.links && generatedData.links.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-2">링크</h5>
                <div className="flex flex-wrap gap-2">
                  {generatedData.links.map((link, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {link.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Carousel Preview */}
            {generatedData.carousel && generatedData.carousel.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-2">결과 이미지/비디오</h5>
                <div className="flex gap-2 overflow-x-auto">
                  {generatedData.carousel.map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 w-32 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      {item.type === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.src} alt={item.caption} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Preview */}
            {generatedData.youtubeVideoId && (
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-2">YouTube 영상</h5>
                <a
                  href={`https://www.youtube.com/watch?v=${generatedData.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  youtube.com/watch?v={generatedData.youtubeVideoId}
                </a>
              </div>
            )}
          </div>

          <div className="p-6 flex gap-4 bg-gray-50">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              미리보기
            </button>
            <Link
              href={`/projects/${generatedData.projectId}`}
              target="_blank"
              className="px-6 py-3 rounded-xl border border-primary text-primary font-medium hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              생성된 페이지 보기
            </Link>
            <button
              onClick={() => {
                setGeneratedData(null);
                setSourceUrl('');
                setProjectId('');
                setAuthors('');
                setVenue('');
                setInstitution('');
                setResearchYear(new Date().getFullYear().toString());
                setPdfFile(null);
                setUploadedPdfUrl('');
              }}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              다시 생성
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && generatedData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">페이지 미리보기</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <AcademicProjectPage data={generatedData} />
            </div>
          </div>
        </div>
      )}

      {/* API Key Notice */}
      <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="font-medium text-amber-800">
              Gemini API Key 필요
            </p>
            <p className="text-sm text-amber-700 mt-1">
              AI 페이지 생성 기능을 사용하려면 <code className="px-1 py-0.5 bg-amber-100 rounded">.env.local</code> 파일에{' '}
              <code className="px-1 py-0.5 bg-amber-100 rounded">GEMINI_API_KEY=your_key</code>를
              설정해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
