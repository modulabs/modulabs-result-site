/**
 * Unified type definitions for modulabs-result-site
 * All project-related types and their Zod schemas
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export const AuthorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  equalContribution: z.boolean().optional(),
  affiliation: z.string().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;

export const LinkSchema = z.object({
  type: z.enum(['paper', 'code', 'arxiv', 'supplementary']),
  url: z.string(),
});

export type Link = z.infer<typeof LinkSchema>;

export const CarouselItemSchema = z.object({
  type: z.enum(['image', 'video']),
  src: z.string(),
  caption: z.string(),
});

export type CarouselItem = z.infer<typeof CarouselItemSchema>;

export const PosterDataSchema = z.object({
  pdfUrl: z.string().optional(),
});

export type PosterData = z.infer<typeof PosterDataSchema>;

export const BibTeXSchema = z.object({
  code: z.string().optional(),
});

export type BibTeX = z.infer<typeof BibTeXSchema>;

export const RelatedWorkSchema = z.object({
  title: z.string(),
  description: z.string(),
  venue: z.string(),
  url: z.string(),
});

export type RelatedWork = z.infer<typeof RelatedWorkSchema>;

export const DetailedDescriptionSchema = z.object({
  problem: z.array(z.string()).optional(),
  method: z.array(z.string()).optional(),
  results: z.array(z.string()).optional(),
});

export type DetailedDescription = z.infer<typeof DetailedDescriptionSchema>;

// ============================================================================
// Project Types
// ============================================================================

/**
 * Minimal project schema for list views and basic project data
 * Used for markdown frontmatter validation
 */
export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['github', 'paper', 'video']),
  createdAt: z.coerce.date(),
  authors: z.array(z.string()),
  published: z.boolean(),
  aiSummary: z.string().default(''),
  year: z.coerce.string().default(''),
  venue: z.string().optional(),
  institution: z.string().optional(),
  // Optional fields
  githubUrl: z.string().optional(),
  arxivUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  youtubeVideoId: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  bibtex: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Full academic project data with detailed information
 * Used for AI generation and detailed project views
 */
export const AcademicProjectDataSchema = z.object({
  title: z.string(),
  authors: z.array(AuthorSchema),
  institution: z.string(),
  venue: z.string(),
  year: z.string(),
  abstract: z.string(),
  highlights: z.array(z.string()).optional(),
  detailedDescription: DetailedDescriptionSchema.optional(),
  links: z.array(LinkSchema),
  teaserVideo: z.string().optional(),
  carousel: z.array(CarouselItemSchema).optional(),
  youtubeVideoId: z.string().optional(),
  poster: PosterDataSchema.optional(),
  bibtex: BibTeXSchema.optional(),
  relatedWorks: z.array(RelatedWorkSchema).optional(),
});

export type AcademicProjectData = z.infer<typeof AcademicProjectDataSchema>;
