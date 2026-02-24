import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ProjectSchema, type Author, type Project } from './types';

export { ProjectSchema, type Project };

const projectsDirectory = path.join(process.cwd(), 'src/content/projects');

// ... (existing imports)

function normalizeFrontmatterNulls(value: unknown): unknown {
  if (value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeFrontmatterNulls);
  }
  if (typeof value === 'object' && value !== null) {
    const normalizedEntries = Object.entries(value).map(([key, innerValue]) => [
      key,
      normalizeFrontmatterNulls(innerValue),
    ]);
    return Object.fromEntries(normalizedEntries);
  }
  return value;
}

export async function getAllProjects(): Promise<Project[]> {
  // Ensure directory exists
  if (!fs.existsSync(projectsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(projectsDirectory);
  const allProjectsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const id = fileName.replace(/\.md$/, '');
      const fullPath = path.join(projectsDirectory, fileName);
      try {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(fileContents);

        return {
          id,
          ...data,
        };
      } catch (error) {
        console.error(`Failed to parse frontmatter for project ${id}:`, error);
        return null;
      }
    });

  // Validate all projects
  const validatedProjects = allProjectsData
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .map(project => {
      const normalizedProject = normalizeFrontmatterNulls(project);
      const result = ProjectSchema.safeParse(normalizedProject);
      if (result.success) {
        return result.data;
      }
      console.error(`Validation failed for project ${project.id}:`, result.error);
      return null;
    })
    .filter((project): project is Project => project !== null);

  // Filter by published and sort by date (newest first)
  return validatedProjects
    .filter(project => project.published)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllProjectsForAdmin(): Promise<Project[]> {
  // Ensure directory exists
  if (!fs.existsSync(projectsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(projectsDirectory);
  const allProjectsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const id = fileName.replace(/\.md$/, '');
      const fullPath = path.join(projectsDirectory, fileName);
      try {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(fileContents);

        // Default to false if published is missing, but schema should handle it
        return {
          id,
          ...data,
        };
      } catch (error) {
        console.error(`Failed to parse frontmatter for project ${id}:`, error);
        return null;
      }
    });

  // Validate all projects
  const validatedProjects = allProjectsData
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .map(project => {
      const normalizedProject = normalizeFrontmatterNulls(project);
      const result = ProjectSchema.safeParse(normalizedProject);
      if (result.success) {
        return result.data;
      }
      console.error(`Validation failed for project ${project.id}:`, result.error);
      return null;
    })
    .filter((project): project is Project => project !== null);

  // Return ALL projects, sorted by date
  return validatedProjects
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

import { deleteFileFromGitHub, saveFileToGitHub } from './github';

export type CreateProjectStorage = 'github' | 'local' | 'local-fallback';

export interface CreateProjectResult {
  success: boolean;
  storage?: CreateProjectStorage;
  warning?: string;
  error?: string;
}

export async function updateProjectMetadata(id: string, updates: { published?: boolean; type?: 'github' | 'paper' | 'video' }): Promise<boolean> {
  try {
    const fullPath = path.join(projectsDirectory, `${id}.md`);

    // In Vercel environment without persistent storage, we might not find the file if it's new
    // But for metadata update, we assume we read it from source. 
    // Ideally we should fetch from GitHub if fs fails in prod, but for hybrid approach:

    let fileContents = '';
    // Try reading local file first (works in dev and during build)
    if (fs.existsSync(fullPath)) {
      fileContents = fs.readFileSync(fullPath, 'utf8');
    } else {
      // TODO: In pure Vercel env, we might need to fetch from GitHub content API if not in build cache
      // For now, assume fs works or return false if not found locally
      return false;
    }

    const { data, content } = matter(fileContents);

    // Update fields if provided
    const newData = {
      ...data,
      ...updates
    };

    // Reconstruct valid frontmatter
    const newContent = matter.stringify(content, newData);

    // Use GitHub API if configured (Production / Vercel)
    if (process.env.GITHUB_TOKEN) {
      const relativePath = `src/content/projects/${id}.md`;
      const success = await saveFileToGitHub(relativePath, newContent, `Update metadata for ${id}`);

      // Sync local file in development mode
      if (success && process.env.NODE_ENV === 'development') {
        fs.writeFileSync(fullPath, newContent, 'utf8');
      }

      return success;
    } else {
      // Fallback to local fs (Local Dev)
      fs.writeFileSync(fullPath, newContent, 'utf8');
      return true;
    }
  } catch (error) {
    console.error(`Error updating project metadata for ${id}:`, error);
    return false;
  }
}

export async function createProject(id: string, content: string): Promise<CreateProjectResult> {
  try {
    const fullPath = path.join(projectsDirectory, `${id}.md`);
    if (!fs.existsSync(projectsDirectory)) {
      fs.mkdirSync(projectsDirectory, { recursive: true });
    }

    // 1. GitHub API (Production/Vercel)
    if (process.env.GITHUB_TOKEN) {
      const relativePath = `src/content/projects/${id}.md`;
      const success = await saveFileToGitHub(relativePath, content, `Create project: ${id}`);

      // Sync local file in development mode
      if (success && process.env.NODE_ENV === 'development') {
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      if (success) {
        return { success: true, storage: 'github' };
      }

      if (process.env.NODE_ENV === 'development') {
        fs.writeFileSync(fullPath, content, 'utf8');
        return {
          success: true,
          storage: 'local-fallback',
          warning: 'GitHub 저장에 실패하여 로컬 저장소로 폴백했습니다.'
        };
      }

      return {
        success: false,
        error:
          'GitHub 저장에 실패했습니다. GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO 설정 및 토큰 권한(contents:write)을 확인해주세요.'
      };
    }

    // 2. Local Filesystem (Local Dev)
    // Check if file exists to prevent accidental overwrite (optional constraint)
    if (fs.existsSync(fullPath)) {
      // For now, let's allow overwrite or maybe throw error? 
      // Admin UI usually implies 'Save' is final. Let's overwrite.
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true, storage: 'local' };

  } catch (error) {
    console.error(`Error creating project ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '프로젝트 생성 중 알 수 없는 오류가 발생했습니다.'
    };
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const fullPath = path.join(projectsDirectory, `${id}.md`);

    // 1. GitHub API (Production/Vercel)
    if (process.env.GITHUB_TOKEN) {
      const relativePath = `src/content/projects/${id}.md`;
      const success = await deleteFileFromGitHub(relativePath, `Delete project: ${id}`);

      if (!success) {
        return false;
      }

      // Sync local file in development mode
      if (process.env.NODE_ENV === 'development' && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      return true;
    }

    // 2. Local Filesystem (Local Dev)
    if (!fs.existsSync(fullPath)) {
      return false;
    }

    fs.unlinkSync(fullPath);
    return true;
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error);
    return false;
  }
}

// Keep for backward compatibility if needed, or remove after refactor
export const updateProjectStatus = async (id: string, published: boolean) => updateProjectMetadata(id, { published });

// Helper to extract sections from markdown content
function extractSection(content: string, sectionTitle: string): string {
  const regex = new RegExp(`## ${sectionTitle}\\s+([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(content: string, sectionTitle: string): string[] {
  const section = extractSection(content, sectionTitle);
  if (!section) return [];
  return section
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().replace(/^-\s*/, ''));
}

function normalizeProjectAuthors(rawAuthors: unknown): Author[] {
  if (!Array.isArray(rawAuthors)) {
    return [];
  }

  const normalized: Author[] = [];
  for (const rawAuthor of rawAuthors) {
    if (typeof rawAuthor === 'string') {
      const name = rawAuthor.trim();
      if (name) {
        normalized.push({ name });
      }
      continue;
    }

    if (typeof rawAuthor !== 'object' || rawAuthor === null) {
      continue;
    }

    const record = rawAuthor as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) {
      continue;
    }

    const author: Author = { name };
    if (typeof record.url === 'string' && record.url.trim()) {
      author.url = record.url.trim();
    }
    if (typeof record.affiliation === 'string' && record.affiliation.trim()) {
      author.affiliation = record.affiliation.trim();
    }
    if (typeof record.equalContribution === 'boolean') {
      author.equalContribution = record.equalContribution;
    }
    normalized.push(author);
  }

  return normalized;
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const fullPath = path.join(projectsDirectory, `${id}.md`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Extract detailed fields from markdown content for the full page view
    const abstract = extractSection(content, 'Abstract');
    const highlights = extractList(content, '주요 기여점');

    // Parse detailed description sections
    const problem = extractList(content, '문제 정의');
    const method = extractList(content, '제안 방법');
    const results = extractList(content, '실험 결과');

    // Extract images for carousel
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    const carousel = [];
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      carousel.push({
        type: 'image',
        caption: match[1],
        src: match[2]
      });
    }

    const authorsDetailed = normalizeProjectAuthors(
      (data as { authorsDetailed?: unknown }).authorsDetailed
    );
    const authorsFromLegacyField = normalizeProjectAuthors(data.authors);
    const authors = authorsDetailed.length > 0 ? authorsDetailed : authorsFromLegacyField;

    const projectData = {
      id,
      ...data,
      authors, // Use normalized authors
      // Add these fields if they exist in content but not frontmatter
      abstract: data.abstract || abstract,
      highlights: data.highlights || highlights,
      detailedDescription: {
        problem,
        method,
        results
      },
      carousel: data.carousel || carousel, // Use extracted images if not defined in frontmatter
    };

    // Try parsing with the fuller academic schema first, fall back to basic if needed
    // We largely treat them as compatible types in the UI via casting
    return projectData as unknown as Project;
  } catch (error) {
    console.error(`Error reading project ${id}:`, error);
    return null;
  }
}

export async function getAllProjectIds(): Promise<string[]> {
  if (!fs.existsSync(projectsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(projectsDirectory);
  return fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => fileName.replace(/\.md$/, ''));
}
