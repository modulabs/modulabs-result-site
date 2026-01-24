import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ProjectSchema, type Project } from './types';

export { ProjectSchema, type Project };

const projectsDirectory = path.join(process.cwd(), 'src/content/projects');

// ... (existing imports)

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
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        id,
        ...data,
      };
    });

  // Validate all projects
  const validatedProjects = allProjectsData
    .map(project => {
      const result = ProjectSchema.safeParse(project);
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
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      // Default to false if published is missing, but schema should handle it
      return {
        id,
        ...data,
      };
    });

  // Validate all projects
  const validatedProjects = allProjectsData
    .map(project => {
      const result = ProjectSchema.safeParse(project);
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

import { saveFileToGitHub } from './github';

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
      return await saveFileToGitHub(relativePath, newContent, `Update metadata for ${id}`);
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

    // Normalize authors to object array if they are strings
    const authors = Array.isArray(data.authors)
      ? data.authors.map((author: string | { name: string }) =>
        typeof author === 'string' ? { name: author } : author
      )
      : [];

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
