import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { MovieDetail } from '@/types/tmdb';
import { getMovieDetails } from '@/lib/tmdb';

export interface CustomMovieFrontmatter {
  title?: string;
  tmdb_id: number | string;
  rating?: number | string;
  deskripsi?: string;
  description?: string;
  videourl?: string;
  video_url?: string;
  image_url?: string;
  tagline?: string;
  featured?: boolean | string;
  [key: string]: any;
}

export interface CustomMovieData {
  slug: string; // e.g. "movie" or "movie.md"
  filename: string;
  frontmatter: CustomMovieFrontmatter;
  contentHtml: string;
  rawContent: string;
}

export interface MergedMovieDetail extends MovieDetail {
  isCustomMarkdown?: boolean;
  customSlug?: string;
  customVideoUrl?: string | null;
  customImageUrl?: string | null;
  customContentHtml?: string | null;
}

const CONTENT_DIR = path.join(process.cwd(), 'video');

/**
 * Ensures the video/ content directory exists.
 */
function ensureContentDirExists(): void {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

/**
 * Gets all markdown files from the `video/` directory.
 */
export function getAllCustomMovieFiles(): string[] {
  ensureContentDirExists();
  try {
    const files = fs.readdirSync(CONTENT_DIR);
    return files.filter((file) => file.endsWith('.md') || file.endsWith('.markdown'));
  } catch (error) {
    console.error('Error reading custom movie files:', error);
    return [];
  }
}

/**
 * Returns all possible slugs for static path generation.
 * For example: if video/movie.md exists, returns ["movie", "movie.md"].
 */
export function getAllCustomMovieSlugs(): string[] {
  const files = getAllCustomMovieFiles();
  const slugs: string[] = [];

  files.forEach((file) => {
    const baseSlug = file.replace(/\.(md|markdown)$/i, '');
    slugs.push(baseSlug);
    slugs.push(file); // Also allow accessing directly via /movie/movie.md
  });

  return Array.from(new Set(slugs));
}

/**
 * Returns a mapping of tmdb_id -> custom slug (e.g. { 1288445: 'movie.md' }).
 */
export function getCustomMovieTmdbMapping(): Record<string, string> {
  const files = getAllCustomMovieFiles();
  const mapping: Record<string, string> = {};

  files.forEach((file) => {
    try {
      const filePath = path.join(CONTENT_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      if (data && data.tmdb_id) {
        mapping[String(data.tmdb_id)] = file;
      }
    } catch (e) {
      console.error(`Error parsing mapping for ${file}:`, e);
    }
  });

  return mapping;
}

/**
 * Finds and parses a custom markdown movie by its slug or tmdb_id.
 */
export async function getCustomMovieBySlug(slugOrId: string | number): Promise<CustomMovieData | null> {
  ensureContentDirExists();
  const searchKey = String(slugOrId).trim().toLowerCase();
  const cleanKey = searchKey.replace(/\.(md|markdown)$/i, '');

  const files = getAllCustomMovieFiles();
  let matchedFile: string | null = null;
  let fileContent = '';

  // 1. Direct filename match (e.g. movie.md or movie)
  for (const file of files) {
    const fileWithoutExt = file.replace(/\.(md|markdown)$/i, '').toLowerCase();
    const fullFileName = file.toLowerCase();

    if (fullFileName === searchKey || fileWithoutExt === cleanKey) {
      matchedFile = file;
      break;
    }
  }

  // 2. If not matched by filename, check if searchKey is a tmdb_id inside frontmatter
  if (!matchedFile) {
    for (const file of files) {
      try {
        const filePath = path.join(CONTENT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(content);
        if (parsed.data && String(parsed.data.tmdb_id).trim() === searchKey) {
          matchedFile = file;
          fileContent = content;
          break;
        }
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
  }

  if (!matchedFile) {
    return null;
  }

  if (!fileContent) {
    const filePath = path.join(CONTENT_DIR, matchedFile);
    fileContent = fs.readFileSync(filePath, 'utf8');
  }

  const { data, content } = matter(fileContent);
  const frontmatter = data as CustomMovieFrontmatter;

  // Convert markdown body to HTML
  const contentHtml = await marked.parse(content || '');

  return {
    slug: matchedFile.replace(/\.(md|markdown)$/i, ''),
    filename: matchedFile,
    frontmatter,
    contentHtml,
    rawContent: content,
  };
}

/**
 * Fetches movie details and merges TMDB API baseline data with custom markdown overrides.
 */
export async function getMovieDetailsWithCustomOverride(
  slugOrId: string | number
): Promise<MergedMovieDetail | null> {
  const customMovie = await getCustomMovieBySlug(slugOrId);

  let tmdbId: number;

  if (customMovie) {
    tmdbId = Number(customMovie.frontmatter.tmdb_id);
    if (!tmdbId || isNaN(tmdbId)) {
      throw new Error(
        `Custom markdown file '${customMovie.filename}' missing valid tmdb_id in frontmatter.`
      );
    }
  } else {
    tmdbId = Number(slugOrId);
    if (!tmdbId || isNaN(tmdbId)) {
      return null;
    }
  }

  // Fetch full data from TMDB API
  const tmdbMovie = await getMovieDetails(tmdbId);
  if (!tmdbMovie) return null;

  // If no custom markdown file is associated, return baseline TMDB details
  if (!customMovie) {
    return {
      ...tmdbMovie,
      isCustomMarkdown: false,
      customVideoUrl: null,
      customContentHtml: null,
    };
  }

  const { frontmatter, contentHtml } = customMovie;

  // Merge overrides from markdown frontmatter
  const overriddenTitle = frontmatter.title && frontmatter.title.trim() !== ''
    ? frontmatter.title
    : tmdbMovie.title;

  const overriddenRating = frontmatter.rating !== undefined && frontmatter.rating !== null && frontmatter.rating !== ''
    ? Number(frontmatter.rating)
    : tmdbMovie.vote_average;

  const overriddenOverview = (frontmatter.deskripsi || frontmatter.description)?.trim() || tmdbMovie.overview;

  const overriddenTagline = frontmatter.tagline?.trim() || tmdbMovie.tagline;

  const videoUrl = frontmatter.videourl || frontmatter.video_url || null;
  const imageUrl = frontmatter.image_url || null;

  return {
    ...tmdbMovie,
    title: overriddenTitle,
    vote_average: overriddenRating,
    overview: overriddenOverview,
    tagline: overriddenTagline,
    isCustomMarkdown: true,
    customSlug: customMovie.slug,
    customVideoUrl: videoUrl,
    customImageUrl: imageUrl,
    customContentHtml: contentHtml && contentHtml.trim().length > 0 ? contentHtml : null,
  };
}

/**
 * Returns all custom markdown movies that have `featured: true` in their frontmatter.
 */
export async function getAllFeaturedCustomMovies(): Promise<any[]> {
  const files = getAllCustomMovieFiles();
  const featuredMovies: any[] = [];

  for (const file of files) {
    try {
      const baseSlug = file.replace(/\.(md|markdown)$/i, '');
      const detail = await getMovieDetailsWithCustomOverride(baseSlug);
      const customData = await getCustomMovieBySlug(baseSlug);

      if (customData && (customData.frontmatter.featured === true || customData.frontmatter.featured === 'true')) {
        if (detail) {
          featuredMovies.push({
            id: `movie-${detail.customSlug || detail.id}`,
            title: detail.title,
            tagline: detail.tagline || undefined,
            overview: detail.overview,
            backdropUrl: detail.customImageUrl || (detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : '/placeholder-poster.jpg'),
            rating: Math.round(detail.vote_average * 10) / 10,
            year: detail.release_date ? new Date(detail.release_date).getFullYear() : '2025',
            duration: detail.runtime ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m` : undefined,
            type: 'movie' as const,
            genres: detail.genres?.map((g) => g.name) || [],
            link: `/movie/${detail.customSlug || detail.id}`,
            badge: 'Featured',
          });
        }
      }
    } catch (err) {
      console.error(`Error loading featured custom movie for ${file}:`, err);
    }
  }

  return featuredMovies;
}
