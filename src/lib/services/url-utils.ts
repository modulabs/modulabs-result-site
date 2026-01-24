/**
 * URL Utilities Service
 * Handles URL parsing and extraction for various platforms
 */

export interface GitHubInfo {
  owner: string;
  repo: string;
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^\?\s]+)/,
    /(?:youtube\.com\/embed\/)([^\?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract GitHub owner and repo from URL
 */
export function extractGitHubInfo(url: string): GitHubInfo | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}

/**
 * Extract arXiv ID from URL
 */
export function extractArxivId(url: string): string | null {
  const patterns = [
    /arxiv\.org\/abs\/(\d+\.\d+)/,
    /arxiv\.org\/pdf\/(\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine source type from URL
 */
export function determineSourceType(url: string): 'youtube' | 'github' | 'arxiv' | 'pdf' | 'unknown' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('github.com')) {
    return 'github';
  }
  if (url.includes('arxiv.org')) {
    return 'arxiv';
  }
  if (url.endsWith('.pdf')) {
    return 'pdf';
  }
  return 'unknown';
}
