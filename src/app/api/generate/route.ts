import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import matter from 'gray-matter';
import type { AcademicProjectData } from '@/lib/types';
import { extractYouTubeId, extractGitHubInfo } from '@/lib/services/url-utils';

export const runtime = 'nodejs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL_NAME = 'gemini-3.1-pro-preview';
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

type PDFJSModule = {
  getDocument: (params: Record<string, unknown>) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>;
        cleanup: () => void;
      }>;
      cleanup: () => Promise<void> | void;
      destroy: () => Promise<void> | void;
    }>;
  };
};

let cachedPDFJSModule: PDFJSModule | null = null;
let cachedStandardFontDataUrl: string | undefined;

type PDFJSImportShape = {
  getDocument?: unknown;
  default?: unknown;
};

type NativeDynamicImport = (specifier: string) => Promise<unknown>;

let cachedNativeDynamicImport: NativeDynamicImport | null = null;

function getStandardFontDataUrl(): string | undefined {
  if (cachedStandardFontDataUrl !== undefined) {
    return cachedStandardFontDataUrl;
  }

  const candidates = [
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts'),
    path.join(process.cwd(), 'modulabs-result-site', 'node_modules', 'pdfjs-dist', 'standard_fonts'),
  ];

  for (const candidatePath of candidates) {
    if (existsSync(candidatePath)) {
      cachedStandardFontDataUrl = `${pathToFileURL(candidatePath).href.replace(/\/?$/, '/')}`;
      return cachedStandardFontDataUrl;
    }
  }

  cachedStandardFontDataUrl = '';
  return undefined;
}

function normalizePDFJSImport(candidate: unknown): PDFJSModule | null {
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { getDocument?: unknown }).getDocument === 'function'
  ) {
    return candidate as PDFJSModule;
  }

  return null;
}

function getPDFJSLegacyModuleSpecifiers(): string[] {
  const specifiers = ['pdfjs-dist/legacy/build/pdf.mjs'];
  const moduleCandidates = [
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs'),
    path.join(process.cwd(), 'modulabs-result-site', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs'),
  ];

  for (const modulePath of moduleCandidates) {
    if (existsSync(modulePath)) {
      specifiers.push(pathToFileURL(modulePath).href);
    }
  }

  return [...new Set(specifiers)];
}

function getNativeDynamicImport(): NativeDynamicImport {
  if (cachedNativeDynamicImport) {
    return cachedNativeDynamicImport;
  }

  cachedNativeDynamicImport = new Function('specifier', 'return import(specifier);') as NativeDynamicImport;
  return cachedNativeDynamicImport;
}

async function loadPDFJSModule(): Promise<PDFJSModule> {
  if (cachedPDFJSModule) {
    return cachedPDFJSModule;
  }

  const nativeImport = getNativeDynamicImport();
  let lastError: unknown;

  for (const specifier of getPDFJSLegacyModuleSpecifiers()) {
    try {
      const importedModule = (await nativeImport(specifier)) as PDFJSImportShape;
      const normalized =
        normalizePDFJSImport(importedModule) ?? normalizePDFJSImport(importedModule.default);

      if (normalized) {
        cachedPDFJSModule = normalized;
        return cachedPDFJSModule;
      }

      lastError = new Error(`pdfjs-dist legacy 모듈 형식이 예상과 다릅니다: ${specifier}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('pdfjs-dist legacy 모듈 로딩에 실패했습니다.');
}

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const pdfjs = await loadPDFJSModule();
  const standardFontDataUrl = getStandardFontDataUrl();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    isEvalSupported: false,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
  });
  const document = await loadingTask.promise;

  try {
    const pageTexts: string[] = [];
    const maxPages = Math.min(document.numPages, 80);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const parts: string[] = [];
        for (const item of content.items as Array<{ str?: unknown; hasEOL?: unknown }>) {
          if (typeof item?.str !== 'string' || !item.str) {
            continue;
          }
          parts.push(item.str);
          parts.push(item.hasEOL ? '\n' : ' ');
        }
        pageTexts.push(parts.join('').trim());
      } finally {
        page.cleanup();
      }
    }

    return pageTexts.join('\n').substring(0, 100000);
  } finally {
    await document.cleanup();
    await document.destroy();
  }
}

function extractPaperPathFromSourceUrl(sourceUrl: string): string | null {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/papers/')) {
    return trimmed;
  }

  if (trimmed.startsWith('file:')) {
    const fileHint = trimmed.slice(5).trim();
    if (!fileHint) return null;
    return fileHint.startsWith('/papers/') ? fileHint : `/papers/${fileHint.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname;
    if (pathname.startsWith('/papers/')) {
      return pathname;
    }

    const publicPapersIndex = pathname.indexOf('/public/papers/');
    if (publicPapersIndex >= 0) {
      return pathname.slice(publicPapersIndex + '/public'.length);
    }

    const papersIndex = pathname.indexOf('/papers/');
    if (papersIndex >= 0) {
      return pathname.slice(papersIndex);
    }
  } catch {
    return null;
  }

  return null;
}

function resolveLocalPdfPathFromPaperPath(paperPath: string): string | null {
  const normalizedPath = path.posix.normalize(paperPath);
  if (!normalizedPath.startsWith('/papers/')) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const candidates = [
    path.join(process.cwd(), 'public', relativePath),
    // Support nested workspace layouts where app root is one level below.
    path.join(process.cwd(), 'modulabs-result-site', 'public', relativePath),
  ];

  for (const candidatePath of candidates) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function resolveLocalPdfPathFromFilename(filename: string): string | null {
  const safeName = filename.trim();
  if (!safeName || !safeName.toLowerCase().endsWith('.pdf')) {
    return null;
  }

  const candidates = [
    path.join(process.cwd(), 'public', 'papers', safeName),
    path.join(process.cwd(), 'modulabs-result-site', 'public', 'papers', safeName),
  ];

  for (const candidatePath of candidates) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function resolveLocalPdfPathFromSourceUrl(sourceUrl: string): string | null {
  const paperPath = extractPaperPathFromSourceUrl(sourceUrl);
  if (paperPath) {
    const fromPaperPath = resolveLocalPdfPathFromPaperPath(paperPath);
    if (fromPaperPath) {
      return fromPaperPath;
    }
  }

  try {
    const parsed = new URL(sourceUrl);
    const basename = path.posix.basename(parsed.pathname);
    return resolveLocalPdfPathFromFilename(basename);
  } catch {
    const withoutQuery = sourceUrl.split('?')[0].split('#')[0];
    const basename = path.posix.basename(withoutQuery);
    return resolveLocalPdfPathFromFilename(basename);
  }
}

function parseGitHubFileUrl(sourceUrl: string): {
  owner: string;
  repo: string;
  ref: string;
  filePath: string;
} | null {
  try {
    const url = new URL(sourceUrl);

    if (url.hostname === 'raw.githubusercontent.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 4) {
        const [owner, repo, ref, ...filePathParts] = parts;
        const filePath = filePathParts.join('/');
        if (owner && repo && ref && filePath) {
          return { owner, repo, ref, filePath };
        }
      }
      return null;
    }

    if (url.hostname === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      // /{owner}/{repo}/blob/{ref}/{path}
      if (parts.length >= 5 && parts[2] === 'blob') {
        const [owner, repo, , ref, ...filePathParts] = parts;
        const filePath = filePathParts.join('/');
        if (owner && repo && ref && filePath) {
          return { owner, repo, ref, filePath };
        }
      }
      return null;
    }
  } catch {
    return null;
  }

  return null;
}

async function loadPdfBufferFromGitHubUrl(sourceUrl: string): Promise<Buffer | null> {
  const githubFile = parseGitHubFileUrl(sourceUrl);
  if (!githubFile) {
    return null;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return null;
  }

  const apiUrl = `https://api.github.com/repos/${githubFile.owner}/${githubFile.repo}/contents/${githubFile.filePath}?ref=${encodeURIComponent(githubFile.ref)}`;
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { content?: string; encoding?: string };
  if (payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    return null;
  }

  const base64 = payload.content.replace(/\s+/g, '');
  return Buffer.from(base64, 'base64');
}

async function loadPdfBufferFromSource(sourceUrl: string): Promise<Buffer | null> {
  const localPath = resolveLocalPdfPathFromSourceUrl(sourceUrl);
  if (localPath) {
    return await readFile(localPath);
  }

  if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
    const githubBuffer = await loadPdfBufferFromGitHubUrl(sourceUrl);
    if (githubBuffer) {
      return githubBuffer;
    }

    const token = process.env.GITHUB_TOKEN;
    const shouldTryAuthHttpFetch =
      sourceUrl.includes('github.com') || sourceUrl.includes('githubusercontent.com');

    if (token && shouldTryAuthHttpFetch) {
      const authenticatedResponse = await fetch(sourceUrl, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (authenticatedResponse.ok) {
        const arrayBuffer = await authenticatedResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`PDF 다운로드 실패 (${sourceUrl}): ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return null;
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function parseAuthorNamesFromTextInput(value: string): string[] {
  return uniqueNonEmpty(
    value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );
}

function toAuthorObjectsFromNames(names: string[]): AcademicProjectData['authors'] {
  return uniqueNonEmpty(names).map((name) => ({ name }));
}

function normalizeAuthorKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mergeAuthor(
  base: AcademicProjectData['authors'][number],
  incoming: AcademicProjectData['authors'][number]
): AcademicProjectData['authors'][number] {
  return {
    ...base,
    name: base.name || incoming.name,
    url: base.url || incoming.url,
    affiliation: base.affiliation || incoming.affiliation,
    equalContribution:
      typeof base.equalContribution === 'boolean'
        ? base.equalContribution
        : incoming.equalContribution,
  };
}

function mergeAuthorSets(
  base: AcademicProjectData['authors'],
  incoming: AcademicProjectData['authors'],
  options: { allowNewNames?: boolean } = {}
): AcademicProjectData['authors'] {
  const allowNewNames = options.allowNewNames ?? true;
  const merged = base
    .map((author) => ({
      ...author,
      name: author.name.trim(),
    }))
    .filter((author) => Boolean(author.name));
  const indexByKey = new Map<string, number>();

  for (let i = 0; i < merged.length; i++) {
    indexByKey.set(normalizeAuthorKey(merged[i].name), i);
  }

  for (const author of incoming) {
    const name = author.name.trim();
    if (!name) continue;
    const key = normalizeAuthorKey(name);
    const index = indexByKey.get(key);
    const normalizedIncoming = { ...author, name };

    if (typeof index === 'number') {
      merged[index] = mergeAuthor(merged[index], normalizedIncoming);
      continue;
    }

    if (!allowNewNames) {
      continue;
    }

    indexByKey.set(key, merged.length);
    merged.push(normalizedIncoming);
  }

  return merged;
}

function parseManualAuthorList(authorList: unknown): AcademicProjectData['authors'] {
  if (!Array.isArray(authorList)) {
    return [];
  }

  const normalized: AcademicProjectData['authors'] = [];
  for (const author of authorList) {
    if (typeof author !== 'object' || author === null) {
      continue;
    }

    const record = author as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) {
      continue;
    }

    const parsedAuthor: AcademicProjectData['authors'][number] = { name };
    if (typeof record.affiliation === 'string' && record.affiliation.trim()) {
      parsedAuthor.affiliation = record.affiliation.trim();
    }
    if (typeof record.url === 'string' && record.url.trim()) {
      parsedAuthor.url = record.url.trim();
    }
    if (typeof record.equalContribution === 'boolean') {
      parsedAuthor.equalContribution = record.equalContribution;
    }

    normalized.push(parsedAuthor);
  }

  return mergeAuthorSets([], normalized);
}

function applyAffiliationByPosition(
  baseAuthors: AcademicProjectData['authors'],
  manualAuthors: AcademicProjectData['authors']
): AcademicProjectData['authors'] {
  if (baseAuthors.length === 0 || manualAuthors.length === 0) {
    return baseAuthors;
  }
  if (baseAuthors.length !== manualAuthors.length) {
    return baseAuthors;
  }
  if (!manualAuthors.some((author) => Boolean(author.affiliation))) {
    return baseAuthors;
  }

  return baseAuthors.map((author, index) => {
    if (author.affiliation) {
      return author;
    }

    const affiliation = manualAuthors[index]?.affiliation;
    return affiliation ? { ...author, affiliation } : author;
  });
}

function normalizeGeneratedAuthors(authors: unknown): AcademicProjectData['authors'] {
  if (!Array.isArray(authors)) {
    return [];
  }

  const normalized: AcademicProjectData['authors'] = [];

  for (const author of authors) {
    if (typeof author === 'string') {
      const name = author.trim();
      if (name) {
        normalized.push({ name });
      }
      continue;
    }

    if (typeof author !== 'object' || author === null) {
      continue;
    }

    const record = author as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) {
      continue;
    }

    const parsedAuthor: AcademicProjectData['authors'][number] = { name };
    if (typeof record.url === 'string' && record.url.trim()) {
      parsedAuthor.url = record.url.trim();
    }
    if (typeof record.affiliation === 'string' && record.affiliation.trim()) {
      parsedAuthor.affiliation = record.affiliation.trim();
    }
    if (typeof record.equalContribution === 'boolean') {
      parsedAuthor.equalContribution = record.equalContribution;
    }

    normalized.push(parsedAuthor);
  }

  return mergeAuthorSets([], normalized);
}

const AUTHOR_NOISE_PATTERNS = [
  /\b(abstract|introduction|keywords?|index terms?|university|institute|department|laboratory|school|college|conference|journal|figure|table|appendix|copyright|arxiv|doi)\b/i,
  /(초록|요약|서론|키워드|대학교|대학원|연구소|학과|실험실|저널|학회|그림|표)/,
];

const AUTHOR_SECTION_STOP_PATTERNS = [
  /^(abstract|요약|초록)\b/i,
  /^(keywords?|key words?|index terms?)\b/i,
  /^1\s*[\.\)]?\s*(introduction|서론)\b/i,
];

const AUTHOR_LINE_HARD_STOP_PATTERNS = [
  /^(figure|fig\.?|table|appendix)\b/i,
  /^https?:\/\//i,
  /^copyright\b/i,
];

function hasAuthorNoise(text: string): boolean {
  return AUTHOR_NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeAuthorToken(token: string): string {
  return token
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[†‡*]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;:.\-]+|[,;:.\-]+$/g, '');
}

function isLikelyEnglishAuthorName(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;

  let nameWordCount = 0;
  for (const word of words) {
    if (/^(?:[A-Z]\.){1,3}$/.test(word)) {
      nameWordCount += 1;
      continue;
    }
    if (/^[A-Z][a-z]+(?:[-'][A-Za-z]+)*$/.test(word)) {
      nameWordCount += 1;
      continue;
    }
    if (/^[A-Z][a-z]?\.$/.test(word)) {
      nameWordCount += 1;
      continue;
    }
    if (/^(?:de|da|del|van|von|der|den|di|la|le|bin|al)$/i.test(word)) {
      continue;
    }
    return false;
  }

  return nameWordCount >= 2;
}

function isLikelyKoreanAuthorName(name: string): boolean {
  const compact = name.replace(/\s+/g, '');
  return /^[가-힣]{2,5}$/.test(compact);
}

function isLikelyAuthorName(name: string): boolean {
  const normalized = normalizeAuthorToken(name);
  if (!normalized) return false;
  if (normalized.length < 2 || normalized.length > 60) return false;
  if (/\d|@|https?:\/\//i.test(normalized)) return false;
  if (hasAuthorNoise(normalized)) return false;
  if (isLikelyKoreanAuthorName(normalized)) return true;
  if (/[A-Za-z]/.test(normalized) && isLikelyEnglishAuthorName(normalized)) return true;
  return false;
}

function extractAuthorNamesFromLine(line: string): string[] {
  if (!line) return [];
  if (AUTHOR_LINE_HARD_STOP_PATTERNS.some((pattern) => pattern.test(line.trim()))) {
    return [];
  }

  const sanitizedLine = line
    .replace(/\S+@\S+/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/orcid\.org\/\S+/gi, ' ')
    .replace(/[\u00B7•·]/g, ',')
    .replace(/\d+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitizedLine || sanitizedLine.length > 240) {
    return [];
  }

  const withoutPrefix = sanitizedLine.replace(/^(?:authors?|author|by|저자)\s*[:\-]?\s*/i, '').trim();
  if (!withoutPrefix) {
    return [];
  }

  let parts = withoutPrefix
    .split(/\s*(?:,|;| and | & |\/)\s*/i)
    .map(normalizeAuthorToken)
    .filter(Boolean);

  if (parts.length <= 1) {
    parts =
      withoutPrefix.match(
        /(?:[A-Z][a-z]+(?:[-'][A-Za-z]+)*|(?:[A-Z]\.){1,3})(?:\s+(?:[A-Z][a-z]+(?:[-'][A-Za-z]+)*|(?:[A-Z]\.){1,3}|(?:de|da|del|van|von|der|den|di|la|le|bin|al))){1,4}|[가-힣]{2,5}/g
      ) ?? [];
  }

  return uniqueNonEmpty(parts.filter(isLikelyAuthorName));
}

function scoreAuthorLine(line: string, names: string[], lineIndex: number): number {
  let score = names.length * 3;

  if (/^(?:authors?|author|by|저자)\b/i.test(line)) {
    score += 7;
  }
  if (lineIndex <= 8) {
    score += 2;
  }
  if (line.length <= 110) {
    score += 1;
  }
  if (hasAuthorNoise(line) && !/^(?:authors?|author|by|저자)\b/i.test(line)) {
    score -= 3;
  }
  if (/\S+@\S+/.test(line)) {
    score -= 1;
  }

  return score;
}

function extractAuthorsFromPdfText(pdfText: string): string[] {
  if (!pdfText) return [];

  const firstChunk = pdfText.slice(0, 12000).replace(/\r/g, '\n');
  const lines = firstChunk
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const stopIndex = lines.findIndex((line) =>
    AUTHOR_SECTION_STOP_PATTERNS.some((pattern) => pattern.test(line))
  );
  const headerLines = lines.slice(0, stopIndex > 0 ? Math.min(stopIndex, 70) : Math.min(lines.length, 70));

  if (headerLines.length === 0) {
    return [];
  }

  const candidates: Array<{ names: string[]; score: number; index: number }> = [];
  const scanLimit = Math.min(headerLines.length, 45);

  for (let i = 0; i < scanLimit; i++) {
    const line = headerLines[i];
    const names = extractAuthorNamesFromLine(line);
    if (names.length === 0) continue;

    candidates.push({
      names,
      score: scoreAuthorLine(line, names, i),
      index: i,
    });

    if (i + 1 < scanLimit) {
      const nextLine = headerLines[i + 1];
      const nextNames = extractAuthorNamesFromLine(nextLine);
      if (nextNames.length > 0 && !hasAuthorNoise(nextLine)) {
        const mergedNames = uniqueNonEmpty([...names, ...nextNames]);
        if (mergedNames.length > names.length) {
          candidates.push({
            names: mergedNames,
            score: scoreAuthorLine(line, names, i) + scoreAuthorLine(nextLine, nextNames, i + 1) - 1,
            index: i,
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.names.length - a.names.length ||
      a.index - b.index
  );

  const best = candidates[0]?.names ?? [];
  if (best.length >= 2) {
    return uniqueNonEmpty(best).slice(0, 12);
  }

  const merged = [...best];
  for (const candidate of candidates.slice(1)) {
    if (candidate.score < (candidates[0]?.score ?? 0) - 3) {
      break;
    }
    for (const name of candidate.names) {
      if (!merged.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        merged.push(name);
      }
      if (merged.length >= 12) {
        return merged;
      }
    }
  }

  return uniqueNonEmpty(merged).slice(0, 12);
}

export async function POST(request: NextRequest) {
  try {
    const { sourceType, sourceUrl, projectId, authors, authorList, venue, institution, researchYear } = await request.json();

    const manualAuthorObjects = parseManualAuthorList(authorList);
    const manualAuthorNames = uniqueNonEmpty([
      ...(typeof authors === 'string' ? parseAuthorNamesFromTextInput(authors) : []),
      ...manualAuthorObjects.map((author) => author.name),
    ]);
    const fallbackManualAuthors = mergeAuthorSets(
      toAuthorObjectsFromNames(manualAuthorNames),
      manualAuthorObjects
    );

    // Prefer PDF-derived authors when available; otherwise keep manual input context.
    let authorInfo = manualAuthorNames.join(', ');
    let extractedPdfAuthorNames: string[] = [];

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
      let pdfText = '';
      try {
        const dataBuffer = await loadPdfBufferFromSource(sourceUrl);
        if (dataBuffer) {
          pdfText = await extractPdfText(dataBuffer);
        }
      } catch (e) {
        console.error('PDF extraction error:', e);
      }

      if (!pdfText.trim()) {
        return NextResponse.json(
          {
            error:
              'PDF 텍스트 추출에 실패했습니다. 텍스트 기반 PDF인지 확인하거나 접근 가능한 PDF URL/업로드 파일을 사용해주세요.',
          },
          { status: 422 }
        );
      }

      extractedPdfAuthorNames = extractAuthorsFromPdfText(pdfText);
      if (extractedPdfAuthorNames.length > 0) {
        authorInfo = extractedPdfAuthorNames.join(', ');
      }

      prompt = buildPDFPrompt(sourceUrl, projectId, authorInfo, venue, institution, pdfText);
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
        const sanitized = content
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
        authors:
          sourceType === 'pdf' && extractedPdfAuthorNames.length > 0
            ? toAuthorObjectsFromNames(extractedPdfAuthorNames)
            : fallbackManualAuthors.length > 0
              ? fallbackManualAuthors
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

    const generatedAuthors = normalizeGeneratedAuthors(generatedData.authors);
    const fallbackPdfAuthors = toAuthorObjectsFromNames(extractedPdfAuthorNames);
    let fallbackAuthors =
      sourceType === 'pdf'
        ? (fallbackPdfAuthors.length > 0 ? fallbackPdfAuthors : fallbackManualAuthors)
        : fallbackManualAuthors;

    if (sourceType === 'pdf') {
      fallbackAuthors = mergeAuthorSets(fallbackAuthors, manualAuthorObjects, {
        allowNewNames: false,
      });
      fallbackAuthors = applyAffiliationByPosition(fallbackAuthors, manualAuthorObjects);
    }

    const enrichedBaseAuthors = mergeAuthorSets(fallbackAuthors, manualAuthorObjects, {
      allowNewNames: false,
    });
    const enrichedWithGenerated = mergeAuthorSets(enrichedBaseAuthors, generatedAuthors, {
      allowNewNames: false,
    });

    const finalAuthors =
      enrichedWithGenerated.length > 0
        ? enrichedWithGenerated
        : generatedAuthors.length > 0
          ? generatedAuthors
          : [{ name: 'Author' }];

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
      authors: finalAuthors,
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
function buildPDFPrompt(sourceUrl: string, projectId: string, authorInfo: string, venue?: string, institution?: string, pdfText?: string): string {
  const contentContext = pdfText
    ? `\n\n[논문 텍스트 시작]\n${pdfText}\n[논문 텍스트 끝]\n\n위 [논문 텍스트]를 유일한 정보원으로 사용하여 답변하세요. 텍스트에 없는 내용은 절대 지어내지 마세요.`
    : `\n\n[논문 텍스트 없음]\n텍스트 추출에 실패한 경우입니다. 확인 가능한 정보만 제한적으로 작성하세요.`;

  return `다음 논문 정보를 바탕으로 Academic Project Page 템플릿에 맞는 데이터를 생성해주세요.

출처: ${sourceUrl}
프로젝트 ID: ${projectId}
저자(자동 추출 우선): ${authorInfo || 'PDF 텍스트에서 자동 추출'}
발표처: ${venue || '정보 없음'}
기관: ${institution || 'ModuLabs'}
${contentContext}

## 중요: 환각(Hallucination) 방지 지침
1. **Fact Check**: 제공된 [논문 텍스트]에 명시된 내용만 포함하세요.
2. **추측 금지**: 저자, 실험 결과, 수치 등이 텍스트에 없다면 지어내지 말고 일반적인 표현을 쓰거나 생략하세요.
3. **언어**: 
   - **title은 원문 유지** (영어 제목 그대로)
   - abstract, highlights 등 모든 설명 텍스트는 **한국어**로 작성
   - 저자명, 소속 기관명, 발표처, BibTeX는 원문 유지
4. **저자 처리**:
   - authors 배열은 PDF 텍스트(특히 제목/초록 앞부분)에서 추출한 실제 저자명으로 채우세요.
   - 저자명을 추측하지 말고, 텍스트에서 확인되지 않으면 빈 문자열 대신 항목을 생략하세요.

다음 형식으로 JSON 형태로 응답해주세요 (markdown 없이 JSON만):
{
  "title": "논문 제목 (원문 영어 유지)",
  "authors": [
    {"name": "저자명", "url": "", "equalContribution": false, "affiliation": "소속기관"}
  ],
  "institution": "${institution || 'ModuLabs'}",
  "venue": "${venue || 'Conference/Journal Name'}",
  "year": "2024",
  "abstract": "논문의 핵심 내용을 상세하게 작성 (한국어, 5-8문장). 논문의 Introduction과 Conclusion을 위주로 요약.",
  "highlights": [
    "핵심 기여점 1 (한국어, 텍스트 기반)",
    "핵심 기여점 2 (한국어, 텍스트 기반)",
    "핵심 기여점 3 (한국어, 텍스트 기반)"
  ],
  "detailedDescription": {
    "problem": ["기존 방법의 문제점 (텍스트 기반)"],
    "method": ["제안 방법의 핵심 (텍스트 기반)"],
    "results": ["실험 결과 (텍스트 기반)"]
  },
  "links": [
    {"type": "paper", "url": "${sourceUrl}"}
  ],
  "carousel": [
    {"type": "image", "src": "GENERATE_ARCHITECTURE_DIAGRAM", "caption": "제안 방법의 전체 아키텍처 다이어그램"}
  ],
  "bibtex": {"code": "@inproceedings{...}"}
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

  const projectType =
    sourceType === 'github' ? 'github' :
      sourceType === 'youtube' ? 'video' :
        'paper';

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

  const markdownBody = `# ${data.title}

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

  const frontmatterData: Record<string, unknown> = {
    id: projectId,
    title: data.title,
    description: `${data.abstract.substring(0, 100)}...`,
    type: projectType,
    createdAt: new Date().toISOString().split('T')[0],
    authors: data.authors.map((a) => a.name),
    authorsDetailed: data.authors.map((a) => ({
      name: a.name,
      ...(a.url ? { url: a.url } : {}),
      ...(a.affiliation ? { affiliation: a.affiliation } : {}),
      ...(typeof a.equalContribution === 'boolean'
        ? { equalContribution: a.equalContribution }
        : {}),
    })),
    published: true,
    venue: data.venue,
    year: researchYear || data.year || new Date().getFullYear().toString(),
    institution: data.institution,
  };

  const normalizedSourceUrl = sourceUrl.trim();

  if (sourceType === 'github' && normalizedSourceUrl) {
    frontmatterData.githubUrl = normalizedSourceUrl;
  }
  if (sourceType === 'pdf' && normalizedSourceUrl) {
    frontmatterData.arxivUrl = normalizedSourceUrl;
  }
  if (sourceType === 'youtube' && normalizedSourceUrl) {
    frontmatterData.videoUrl = normalizedSourceUrl;
  }
  if (data.youtubeVideoId) {
    frontmatterData.youtubeVideoId = data.youtubeVideoId;
  }

  const markdown = matter.stringify(markdownBody, frontmatterData);

  const filepath = path.join(contentDir, `${projectId}.md`);
  await writeFile(filepath, markdown, 'utf-8');
  console.log(`Markdown file saved: ${filepath}`);
}
