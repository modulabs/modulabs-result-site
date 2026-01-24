import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { AcademicProjectData } from '@/lib/types';
import { extractYouTubeId, extractGitHubInfo } from '@/lib/services/url-utils';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL_NAME = 'gemini-3-pro-preview';
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

export async function POST(request: NextRequest) {
  try {
    const { sourceType, sourceUrl, projectId, authors, authorList, venue, institution, researchYear } = await request.json();

    // Convert authorList to authors string for prompt context
    let authorInfo = authors || '';
    if (authorList && authorList.length > 0) {
      authorInfo = authorList
        .map((a: { name: string; affiliation: string }) => `${a.name}${a.affiliation ? ` (${a.affiliation})` : ''}`)
        .join(', ');
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!sourceUrl || !projectId) {
      return NextResponse.json(
        { error: 'sourceUrl과 projectId는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // Import AI service dynamically
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const textModel = genAI.getGenerativeModel({
      model: TEXT_MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    const imageModel = genAI.getGenerativeModel({ model: IMAGE_MODEL_NAME });

    // Extract additional info from source URL
    let youtubeVideoId: string | undefined;
    let githubInfo: { owner: string; repo: string } | null = null;

    if (sourceType === 'youtube') {
      youtubeVideoId = extractYouTubeId(sourceUrl) || undefined;
    } else if (sourceType === 'github') {
      githubInfo = extractGitHubInfo(sourceUrl);
    }

    // Build prompt based on source type
    let prompt = '';

    if (sourceType === 'pdf') {
      prompt = buildPDFPrompt(sourceUrl, projectId, authorInfo, venue, institution);
    } else if (sourceType === 'github') {
      prompt = buildGitHubPrompt(sourceUrl, githubInfo, projectId, authorInfo, institution);
    } else if (sourceType === 'youtube') {
      prompt = buildYouTubePrompt(sourceUrl, youtubeVideoId, projectId, authorInfo, institution);
    }

    // Generate text content
    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up common AI response issues
    text = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    let generatedData: Partial<AcademicProjectData>;
    try {
      let jsonStr = jsonMatch[0];

      // Fix control characters and JSON issues from AI responses
      jsonStr = jsonStr.replace(/"([^"]*?)"/g, (match, content) => {
        let sanitized = content
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t')
          .replace(/\\"/g, '"');
        return '"' + sanitized + '"';
      });

      // Fix common trailing comma issue
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

      generatedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      // Fallback: create basic data if JSON parsing fails
      generatedData = {
        title: `${projectId} Project`,
        authors: authors
          ? authors.split(',').map((name: string) => ({ name: name.trim() }))
          : [{ name: 'Author Name' }],
        institution: institution || 'ModuLabs',
        venue: venue || 'Publication Venue',
        year: new Date().getFullYear().toString(),
        abstract: text.substring(0, 500),
        links: [
          {
            type: sourceType === 'github' ? 'code' : 'paper',
            url: sourceUrl,
          },
        ],
        carousel: [],
        relatedWorks: [],
      };
    }

    // Sanitize carousel captions
    if (generatedData.carousel) {
      generatedData.carousel = generatedData.carousel.map((item) => ({
        ...item,
        caption: item.caption
          ?.replace(/\\!/g, '!')
          .replace(/\\\[/g, '[')
          .replace(/\\\]/g, ']')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\_/g, '_')
          .trim() || '',
      }));
    }

    // Generate images for carousel items marked with GENERATE_ prefix
    if (sourceType === 'pdf' && generatedData.carousel) {
      for (let i = 0; i < generatedData.carousel.length; i++) {
        const item = generatedData.carousel[i];
        if (item.type === 'image' && item.src.startsWith('GENERATE_')) {
          try {
            const imagePrompt = `Create a professional technical architecture diagram for a research paper titled: "${generatedData.title}".

Paper summary: ${generatedData.abstract?.substring(0, 500)}

Generate a clean, modern architecture diagram that visually represents:
- The overall system structure
- Key components and their relationships
- Data flow from input to output
- The main technical innovation

Style: Clean academic technical diagram with boxes, arrows, and labels. Use a professional color scheme with blues and grays. Include clear labels in English.`;

            const imageResult = await imageModel.generateContent(imagePrompt);
            const imageResponse = await imageResult.response;

            if (imageResponse.candidates && imageResponse.candidates[0]) {
              const parts = imageResponse.candidates[0].content?.parts || [];
              const imagePart = parts.find((part: any) => part.inlineData);

              if (imagePart?.inlineData?.data) {
                const mimeType = imagePart.inlineData.mimeType || 'image/png';
                generatedData.carousel[i].src = `data:${mimeType};base64,${imagePart.inlineData.data}`;
              } else {
                generatedData.carousel.splice(i, 1);
                i--;
              }
            } else {
              generatedData.carousel.splice(i, 1);
              i--;
            }
          } catch (imageError) {
            console.error('Image generation error:', imageError);
            generatedData.carousel.splice(i, 1);
            i--;
          }
        }
      }
    }

    // Ensure required fields
    const responseData: AcademicProjectData = {
      title: generatedData.title || `${projectId} Project`,
      authors: generatedData.authors || [{ name: 'Author' }],
      institution: generatedData.institution || institution || 'ModuLabs',
      venue: generatedData.venue || venue || 'Publication',
      year: generatedData.year || new Date().getFullYear().toString(),
      abstract: generatedData.abstract || 'Abstract text here...',
      highlights: generatedData.highlights,
      detailedDescription: generatedData.detailedDescription,
      links: generatedData.links || [{ type: 'paper', url: sourceUrl }],
      teaserVideo: generatedData.teaserVideo,
      carousel: generatedData.carousel,
      youtubeVideoId: generatedData.youtubeVideoId || youtubeVideoId,
      poster: generatedData.poster,
      bibtex: generatedData.bibtex,
      relatedWorks: generatedData.relatedWorks,
    };

    // Auto-save markdown file
    try {
      await saveMarkdownFile(responseData, projectId, sourceType, sourceUrl, researchYear);
    } catch (saveError) {
      console.error('Failed to save markdown file:', saveError);
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        type: sourceType,
        sourceUrl,
        ...responseData,
      },
      message: '페이지가 자동으로 생성되었습니다.',
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      {
        error: '콘텐츠 생성 중 오류가 발생했습니다.',
        details: error.message || '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

// Prompt building functions
function buildPDFPrompt(sourceUrl: string, projectId: string, authorInfo: string, venue?: string, institution?: string): string {
  return `다음 논문 정보를 바탕으로 Academic Project Page 템플릿에 맞는 데이터를 생성해주세요.

출처: ${sourceUrl}
프로젝트 ID: ${projectId}
저자: ${authorInfo || '정보 없음'}
발표처: ${venue || '정보 없음'}
기관: ${institution || 'ModuLabs'}

## 중요: 출력 언어 지시
- **title은 원문 유지** (영어 제목 그대로)
- abstract, highlights 등 모든 설명 텍스트는 **한국어**로 작성
- 저자명, 소속 기관명, 발표처, BibTeX는 원문 유지

다음 형식으로 JSON 형태로 응답해주세요 (markdown 없이 JSON만):
{
  "title": "논문 제목 (원문 영어 유지)",
  "authors": [
    {"name": "저자명1", "url": "https://example.com/author1", "equalContribution": false, "affiliation": "소속기관1"},
    {"name": "저자명2", "url": "", "equalContribution": false, "affiliation": "소속기관2"}
  ],
  "institution": "${institution || 'ModuLabs'}",
  "venue": "${venue || 'Conference/Journal Name'}",
  "year": "2024",
  "abstract": "논문의 핵심 내용을 상세하게 작성 (한국어, 5-8문장)",
  "highlights": [
    "첫 번째 핵심 기여점 (한국어 개조식, 15자 이내)",
    "두 번째 핵심 기여점 (한국어 개조식, 15자 이내)",
    "세 번째 핵심 기여점 (한국어 개조식, 15자 이내)"
  ],
  "detailedDescription": {
    "problem": ["기존 방법의 문제점 1", "기존 방법의 문제점 2"],
    "method": ["제안 방법의 핵심 구성요소 1", "제안 방법의 핵심 구성요소 2"],
    "results": ["주요 실험 결과 1", "주요 실험 결과 2"]
  },
  "links": [
    {"type": "paper", "url": "${sourceUrl}"}
  ],
  "carousel": [
    {"type": "image", "src": "GENERATE_ARCHITECTURE_DIAGRAM", "caption": "제안 방법의 전체 아키텍처 다이어그램"}
  ],
  "bibtex": {"code": "@inproceedings{title, author, year, ...}"}
}`;
}

function buildGitHubPrompt(sourceUrl: string, githubInfo: { owner: string; repo: string } | null, projectId: string, authorInfo: string, institution?: string): string {
  return `다음 GitHub 저장소 정보를 바탕으로 Academic Project Page 템플릿에 맞는 데이터를 생성해주세요.

저장소: ${sourceUrl}
${githubInfo ? `Owner: ${githubInfo.owner}, Repo: ${githubInfo.repo}` : ''}
프로젝트 ID: ${projectId}
저자: ${authorInfo || githubInfo?.owner || '정보 없음'}

## 중요: 출력 언어 지시
- **title은 원문 유지** (영어 제목 그대로)
- abstract, highlights, carousel의 caption 등 모든 설명 텍스트는 **한국어**로 작성
- 저자명, 저장소 이름 등 고유명사는 원문 유지

다음 형식으로 JSON 형태로 응답해주세요:
{
  "title": "프로젝트 제목 (원문 영어 유지)",
  "authors": [
    {"name": "저자명1", "url": "https://github.com/author1", "equalContribution": false, "affiliation": "소속기관"}
  ],
  "institution": "${institution || 'ModuLabs'}",
  "venue": "GitHub Open Source Project",
  "year": "2024",
  "abstract": "프로젝트 상세 설명 (README 기반, 한국어, 3-5문장)",
  "highlights": [
    "첫 번째 핵심 기능 또는 특징 (한국어 개조식, 15자 이내)",
    "두 번째 핵심 기능 또는 특징 (한국어 개조식, 15자 이내)"
  ],
  "links": [
    {"type": "code", "url": "${sourceUrl}"}
  ]
}`;
}

function buildYouTubePrompt(sourceUrl: string, youtubeVideoId: string | undefined, projectId: string, authorInfo: string, institution?: string): string {
  return `다음 YouTube 영상의 URL과 메타데이터를 기반으로, 해당 영상이 소개하는 프로젝트나 기술에 대한 상세한 분석 보고서를 작성해주세요.

영상 정보:
- URL: ${sourceUrl}
${youtubeVideoId ? `- Video ID: ${youtubeVideoId}` : ''}
- 추가 정보: ${projectId}
- 작성자/채널: ${authorInfo || '정보 없음'}

## 분석 목표
이 영상의 내용을 심층적으로 분석하여 기술 블로그나 프로젝트 포트폴리오에 사용할 수 있는 고품질의 콘텐츠를 생성해야 합니다.
영상의 종류(데모, 튜토리얼, 컨퍼런스 발표, 인터뷰 등)를 파악하고 그에 맞는 톤앤매너를 유지하세요.

## 상세 분석 요청 항목
1. **핵심 요약 (Abstract)**: 영상 전체 내용을 아우르는 포괄적인 요약 (한국어 4-6문장). 문제 제기, 솔루션, 주요 성과를 포함하세요.
2. **주요 특징 (Highlights)**: 영상에서 강조되는 핵심 기능, 기술적 혁신, 또는 배울 점을 3가지로 요약하세요.
3. **상세 설명 (Detailed Description)**:
   - **문제 정의 (Problem)**: 이 프로젝트나 영상이 해결하고자 하는 문제나 다루는 주제의 배경.
   - **해결 방안/방법론 (Method/Solution)**: 사용된 기술, 아키텍처, 접근 방식, 또는 튜토리얼의 주요 단계.
   - **결과/성과 (Results/Key Takeaways)**: 시연 결과, 성능 지표, 또는 시청자가 얻을 수 있는 핵심 인사이트.

## 출력 형식 (JSON)
반드시 아래의 JSON 포맷을 준수해야 합니다. 마크다운 코드 블록(\`\`\`json)으로 감싸지 말고 순수 JSON만 반환하거나, 마크다운이 포함되더라도 파싱 가능한 형태여야 합니다.

{
  "title": "영상 제목 (원문 영어 유지)",
  "authors": [
    {"name": "채널명 또는 발표자", "url": "", "equalContribution": false, "affiliation": "YouTube"}
  ],
  "institution": "${institution || 'YouTube'}",
  "venue": "YouTube",
  "year": "${new Date().getFullYear()}",
  "abstract": "상세한 요약문 (한국어)",
  "highlights": [
    "핵심 특징 1 (한국어, 20자 내외)",
    "핵심 특징 2 (한국어, 20자 내외)",
    "핵심 특징 3 (한국어, 20자 내외)"
  ],
  "detailedDescription": {
    "problem": ["문제점 또는 배경 1", "문제점 또는 배경 2"],
    "method": ["사용된 기술 또는 방법론 1", "사용된 기술 또는 방법론 2"],
    "results": ["주요 성과 또는 교훈 1", "주요 성과 또는 교훈 2"]
  },
  "links": [{"type": "paper", "url": "${sourceUrl}"}],
  "youtubeVideoId": "${youtubeVideoId || ''}"
}

## 주의사항
- **언어**: title, institution 등 고유명사는 원문을 유지하고, abstract 및 상세 설명은 **자연스러운 한국어**로 번역/작성하세요.
- **내용의 깊이**: 단순한 표면적 묘사가 아닌, 기술적인 깊이가 느껴지도록 전문 용어를 적절히 사용하세요.
`;
}

async function saveMarkdownFile(
  data: AcademicProjectData,
  projectId: string,
  sourceType: string,
  sourceUrl: string,
  researchYear?: string
): Promise<void> {
  const contentDir = path.join(process.cwd(), 'src', 'content', 'projects');
  if (!existsSync(contentDir)) {
    await mkdir(contentDir, { recursive: true });
  }

  const escapeMarkdownAlt = (text: string) => {
    return text
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/"/g, '\\"');
  };

  const authorsList = data.authors
    .map((a) => (a.url ? `[${a.name}](${a.url})` : a.name))
    .join(', ');

  const linksMarkdown = data.links
    .map((l) => {
      const labels = { paper: 'Paper', code: 'Code', arxiv: 'arXiv', supplementary: 'Supplementary' };
      return `- [${labels[l.type]}](${l.url})`;
    })
    .join('\n');

  const carouselMarkdown =
    data.carousel && data.carousel.length > 0
      ? data.carousel
        .map((c) => `![${escapeMarkdownAlt(c.caption || 'image')}](${c.src})\n_${c.caption}_`)
        .join('\n\n')
      : '';

  const highlightsMarkdown =
    data.highlights && data.highlights.length > 0
      ? `\n## 주요 기여점\n\n${data.highlights.map((h) => `- ${h}`).join('\n')}\n`
      : '';

  const detailedDescriptionMarkdown = data.detailedDescription
    ? (() => {
      let md = '\n## 상세 설명\n\n';
      if (data.detailedDescription.problem && data.detailedDescription.problem.length > 0) {
        md += '### 문제 정의\n\n';
        md += data.detailedDescription.problem.map((p) => `- ${p}`).join('\n') + '\n\n';
      }
      if (data.detailedDescription.method && data.detailedDescription.method.length > 0) {
        md += '### 제안 방법\n\n';
        md += data.detailedDescription.method.map((m) => `- ${m}`).join('\n') + '\n\n';
      }
      if (data.detailedDescription.results && data.detailedDescription.results.length > 0) {
        md += '### 실험 결과\n\n';
        md += data.detailedDescription.results.map((r) => `- ${r}`).join('\n') + '\n\n';
      }
      return md;
    })()
    : '';

  const markdown = `---
id: ${projectId}
title: ${data.title}
description: ${data.abstract.substring(0, 100)}...
type: ${sourceType === 'github' ? 'github' : 'paper'}
createdAt: ${new Date().toISOString().split('T')[0]}
authors: [${data.authors.map((a) => `'${a.name}'`).join(', ')}]
published: true
venue: ${data.venue}
year: ${researchYear || data.year || new Date().getFullYear().toString()}
institution: ${data.institution}
${sourceType === 'github' ? `githubUrl: ${sourceUrl}` : ''}
${sourceType === 'pdf' ? `arxivUrl: ${sourceUrl}` : ''}
${data.youtubeVideoId ? `youtubeVideoId: ${data.youtubeVideoId}` : ''}
---

# ${data.title}

**Authors:** ${authorsList}

**Institution:** ${data.institution}

**Venue:** ${data.venue} ${data.year}

## Links

${linksMarkdown}

## Abstract

${data.abstract}
${highlightsMarkdown}
${detailedDescriptionMarkdown}
${data.teaserVideo ? `## Teaser Video\n\n[Watch Teaser](${data.teaserVideo})\n` : ''}

${carouselMarkdown ? `## Results\n\n${carouselMarkdown}\n` : ''}

${data.youtubeVideoId ? `## Video Presentation\n\n[![Video](https://img.youtube.com/vi/${data.youtubeVideoId}/maxresdefault.jpg)](https://www.youtube.com/watch?v=${data.youtubeVideoId})\n` : ''}

${data.bibtex ? `## BibTeX\n\n\`\`\`bibtex\n${data.bibtex.code}\n\`\`\`\n` : ''}
`;

  const filepath = path.join(contentDir, `${projectId}.md`);
  await writeFile(filepath, markdown, 'utf-8');
  console.log(`Markdown file saved: ${filepath}`);
}
