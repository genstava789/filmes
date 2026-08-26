import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { MovieDetail } from '@/types/tmdb';
import { getMovieDetails, getImageUrl, searchMovies } from '@/lib/tmdb';
import { FeaturedItem } from '@/config';

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
  subtitle?: string;
  subtitles?: any;
  subtitle_url?: string;
  sub_url?: string;
  caption_url?: string;
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
  customSubtitles?: any;
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
 * Converts text into URL slug for route matching.
 */
function cleanSlug(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns all possible slugs for static path generation.
 * Generates combinations of: filename, filename.md, tmdb_id, title slug, title-year slug, and title-id slug.
 */
export function getAllCustomMovieSlugs(): string[] {
  const files = getAllCustomMovieFiles();
  const slugs: string[] = [];

  files.forEach((file) => {
    const baseSlug = file.replace(/\.(md|markdown)$/i, '');
    slugs.push(baseSlug);
    slugs.push(file);

    try {
      const filePath = path.join(CONTENT_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      if (data) {
        if (data.tmdb_id) {
          slugs.push(String(data.tmdb_id));
        }
        if (data.title) {
          const tSlug = cleanSlug(data.title);
          if (tSlug) {
            slugs.push(tSlug);
            if (data.tmdb_id) {
              slugs.push(`${tSlug}-${data.tmdb_id}`);
            }
            const year = data.year || data.release_date?.slice(0, 4) || '2026';
            if (year) {
              slugs.push(`${tSlug}-${year}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error reading slugs for ${file}:`, e);
    }
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
 * Finds and parses a custom markdown movie by its slug, title slug, title-year, trailing ID, or tmdb_id.
 */
export async function getCustomMovieBySlug(slugOrId: string | number): Promise<CustomMovieData | null> {
  ensureContentDirExists();
  const searchKey = String(slugOrId).trim().toLowerCase();
  const cleanKey = searchKey.replace(/\.(md|markdown)$/i, '');

  // Check if searchKey has trailing ID or 4-digit year (e.g. "mutiny-2026" or "mutiny-1288445")
  const idMatch = cleanKey.match(/-(\d+)$/);
  const trailingId = idMatch ? idMatch[1] : null;
  const cleanWithoutSuffix = cleanKey.replace(/-(19\d{2}|20\d{2}|\d+)$/, '');

  const files = getAllCustomMovieFiles();
  let matchedFile: string | null = null;
  let fileContent = '';

  // 1. Direct filename match (e.g. movie.md or movie)
  for (const file of files) {
    const fileWithoutExt = file.replace(/\.(md|markdown)$/i, '').toLowerCase();
    const fullFileName = file.toLowerCase();

    if (fullFileName === searchKey || fileWithoutExt === cleanKey || fileWithoutExt === cleanWithoutSuffix) {
      matchedFile = file;
      break;
    }
  }

  // 2. Match by frontmatter tmdb_id, title slug, title-year slug, or trailing ID
  if (!matchedFile) {
    for (const file of files) {
      try {
        const filePath = path.join(CONTENT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(content);
        const data = parsed.data as CustomMovieFrontmatter;

        if (data) {
          const tmdbIdStr = String(data.tmdb_id || '').trim();
          const titleSlug = cleanSlug(data.title);

          // Direct TMDB ID match
          if (tmdbIdStr && (tmdbIdStr === cleanKey || tmdbIdStr === trailingId)) {
            matchedFile = file;
            fileContent = content;
            break;
          }

          // Title slug match (e.g. "mutiny" === "mutiny" or "mutiny-2026" starts with "mutiny")
          if (
            titleSlug &&
            (titleSlug === cleanKey ||
              titleSlug === cleanWithoutSuffix ||
              cleanKey === `${titleSlug}-${data.year || '2026'}` ||
              cleanKey.startsWith(titleSlug))
          ) {
            matchedFile = file;
            fileContent = content;
            break;
          }
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
 * Supports dual-routing: ID (1288445), title-year (mutiny-2026), and title-id slug (mutiny-1288445).
 */
export async function getMovieDetailsWithCustomOverride(
  slugOrId: string | number
): Promise<MergedMovieDetail | null> {
  const customMovie = await getCustomMovieBySlug(slugOrId);

  let tmdbId: number | null = null;

  if (customMovie) {
    tmdbId = Number(customMovie.frontmatter.tmdb_id);
    if (!tmdbId || isNaN(tmdbId)) {
      throw new Error(
        `Custom markdown file '${customMovie.filename}' missing valid tmdb_id in frontmatter.`
      );
    }
  } else {
    const str = String(slugOrId).trim();
    if (/^\d+$/.test(str)) {
      tmdbId = Number(str);
    } else {
      const yearMatch = str.match(/-(19\d{2}|20\d{2})$/);
      const idMatch = str.match(/-(\d{5,})$/);

      if (idMatch) {
        tmdbId = Number(idMatch[1]);
      } else {
        const cleanSearch = (yearMatch ? str.slice(0, yearMatch.index) : str).replace(/-/g, ' ');
        const searchYear = yearMatch ? yearMatch[1] : undefined;
        try {
          const searchRes = await searchMovies(cleanSearch);
          if (searchRes.results && searchRes.results.length > 0) {
            const matched = searchYear
              ? searchRes.results.find((m) => m.release_date && m.release_date.startsWith(searchYear)) || searchRes.results[0]
              : searchRes.results[0];
            tmdbId = matched ? matched.id : null;
          }
        } catch (e) {
          console.error(`Error searching TMDB for movie slug ${str}:`, e);
        }
      }
    }
  }

  if (!tmdbId || isNaN(tmdbId)) {
    return null;
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
  const subtitles = frontmatter.subtitles || frontmatter.subtitle || frontmatter.subtitle_url || frontmatter.sub_url || frontmatter.caption_url || null;

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
    customSubtitles: subtitles,
    customContentHtml: contentHtml && contentHtml.trim().length > 0 ? contentHtml : null,
  };
}

/**
 * Returns all custom markdown movies that have `featured: true` in their frontmatter.
 */
export async function getAllFeaturedCustomMovies(): Promise<FeaturedItem[]> {
  const files = getAllCustomMovieFiles();
  const featuredMovies: FeaturedItem[] = [];

  for (const file of files) {
    try {
      const baseSlug = file.replace(/\.(md|markdown)$/i, '');
      const detail = await getMovieDetailsWithCustomOverride(baseSlug);
      const customData = await getCustomMovieBySlug(baseSlug);

      if (customData && (customData.frontmatter.featured === true || customData.frontmatter.featured === 'true')) {
        if (detail) {
          const backdrop = detail.customImageUrl || (detail.backdrop_path ? getImageUrl(detail.backdrop_path, 'w1280') : (detail.poster_path ? getImageUrl(detail.poster_path, 'w780') : '/placeholder-poster.svg'));
          const poster = detail.customImageUrl || (detail.poster_path ? getImageUrl(detail.poster_path, 'w500') : (detail.backdrop_path ? getImageUrl(detail.backdrop_path, 'w780') : '/placeholder-poster.svg'));

          featuredMovies.push({
            id: `movie-${detail.customSlug || detail.id}`,
            tmdbId: detail.id,
            title: detail.title,
            tagline: detail.tagline || undefined,
            overview: detail.overview,
            backdropUrl: backdrop,
            posterUrl: poster,
            rating: Math.round(detail.vote_average * 10) / 10,
            year: detail.release_date ? new Date(detail.release_date).getFullYear() : '2025',
            duration: detail.runtime ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m` : undefined,
            type: 'movie' as const,
            genres: detail.genres?.map((g) => g.name) || [],
            link: `/movie/${detail.customSlug || detail.id}`,
            badge: 'Featured',
            featured: true,
            isCustom: true,
          });
        }
      }
    } catch (err) {
      console.error(`Error loading featured custom movie for ${file}:`, err);
    }
  }

  return featuredMovies;
}
