import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { TVShowDetail } from '@/types/tmdb';
import { getTVShowDetails } from '@/lib/tmdb';

export interface CustomTVFrontmatter {
  title?: string;
  tmdb_id: number | string;
  rating?: number | string;
  deskripsi?: string;
  description?: string;
  image_url?: string;
  tagline?: string;
  featured?: boolean | string;
  [key: string]: any;
}

export interface CustomEpisodeFrontmatter {
  title?: string;
  videourl?: string;
  video_url?: string;
  image_url?: string;
  deskripsi?: string;
  description?: string;
  rating?: number | string;
  duration?: string;
  episode_number?: number | string;
  season_number?: number | string;
  [key: string]: any;
}

export interface CustomEpisode {
  slug: string; // e.g. "s1/e1" or "e1"
  filename: string;
  seasonNumber: number | null; // null if flat without season folders
  seasonFolder: string | null; // e.g. "s1"
  episodeNumber: number; // e.g. 1
  episodeLabel: string; // e.g. "S1:E1" or "EP 01"
  title: string;
  videoUrl: string | null;
  imageUrl: string | null;
  overview: string;
  rating?: number | null;
  duration?: string | null;
  contentHtml: string | null;
  rawContent: string;
  urlPath: string; // e.g. "/tv/lanterns/s1/e1"
}

export interface CustomSeason {
  seasonNumber: number | null;
  seasonName: string; // e.g. "Season 1" or "All Episodes"
  seasonFolder: string | null;
  episodes: CustomEpisode[];
}

export interface CustomTVShowData {
  showSlug: string; // e.g. "lanterns"
  hasSeasons: boolean; // true if s1/, s2/ subfolders exist
  frontmatter: CustomTVFrontmatter;
  contentHtml: string | null;
  seasons: CustomSeason[];
  allEpisodes: CustomEpisode[];
}

export interface MergedTVShowDetail extends TVShowDetail {
  isCustomTV?: boolean;
  customSlug?: string;
  customImageUrl?: string | null;
  customContentHtml?: string | null;
  hasSeasons?: boolean;
  seasonsList?: CustomSeason[];
  allEpisodes?: CustomEpisode[];
  activeEpisode?: CustomEpisode | null;
}

const TV_CONTENT_DIR = path.join(process.cwd(), 'tv');

/**
 * Ensures the tv/ content directory exists.
 */
function ensureTVDirExists(): void {
  if (!fs.existsSync(TV_CONTENT_DIR)) {
    fs.mkdirSync(TV_CONTENT_DIR, { recursive: true });
  }
}

/**
 * Parses episode number from filename or string (e.g. "e1.md", "episode-2.md", "03.md").
 */
function parseEpisodeNumber(filename: string, fallbackIndex: number): number {
  const clean = filename.replace(/\.(md|markdown)$/i, '');
  const match = clean.match(/(?:ep?|episode[-_]?)?(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return fallbackIndex + 1;
}

/**
 * Parses season number from folder name (e.g. "s1", "season-2", "season3").
 */
function parseSeasonNumber(folderName: string): number | null {
  const match = folderName.match(/(?:s|season[-_]?)?(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Gets all TV show directory names in `tv/`.
 */
export function getAllCustomTVShowDirs(): string[] {
  ensureTVDirExists();
  try {
    const entries = fs.readdirSync(TV_CONTENT_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    console.error('Error reading tv directories:', error);
    return [];
  }
}

/**
 * Returns all possible slug paths for Next.js generateStaticParams().
 * E.g. [
 *   { slug: ['lanterns'] },
 *   { slug: ['lanterns', 's1', 'e1'] },
 *   { slug: ['lanterns', 's1', 'e1.md'] },
 *   { slug: ['lanterns', 'e1'] }
 * ]
 */
export async function getAllCustomTVSlugPaths(): Promise<{ slug: string[] }[]> {
  const dirs = getAllCustomTVShowDirs();
  const paths: { slug: string[] }[] = [];

  for (const showSlug of dirs) {
    // Show overview page
    paths.push({ slug: [showSlug] });

    const showData = await getCustomTVShowBySlug(showSlug);
    if (!showData) continue;

    for (const ep of showData.allEpisodes) {
      if (ep.seasonFolder) {
        // e.g. ['lanterns', 's1', 'e1']
        const baseEp = ep.filename.replace(/\.(md|markdown)$/i, '');
        paths.push({ slug: [showSlug, ep.seasonFolder, baseEp] });
        paths.push({ slug: [showSlug, ep.seasonFolder, ep.filename] });
      } else {
        // Flat episode without season folder: e.g. ['lanterns', 'e1']
        const baseEp = ep.filename.replace(/\.(md|markdown)$/i, '');
        paths.push({ slug: [showSlug, baseEp] });
        paths.push({ slug: [showSlug, ep.filename] });
      }
    }
  }

  return paths;
}

/**
 * Reads and parses a custom TV show and all its episodes from `tv/[showSlug]`.
 */
export async function getCustomTVShowBySlug(showSlugOrTmdbId: string | number): Promise<CustomTVShowData | null> {
  ensureTVDirExists();
  const searchKey = String(showSlugOrTmdbId).trim().toLowerCase();
  const showDirs = getAllCustomTVShowDirs();

  let matchedDir: string | null = null;
  let showDirFullPath = '';

  // 1. Direct directory match
  for (const dir of showDirs) {
    if (dir.toLowerCase() === searchKey) {
      matchedDir = dir;
      showDirFullPath = path.join(TV_CONTENT_DIR, dir);
      break;
    }
  }

  // 2. Search by tmdb_id in _index.md
  if (!matchedDir) {
    for (const dir of showDirs) {
      const fullPath = path.join(TV_CONTENT_DIR, dir);
      const indexPath = fs.existsSync(path.join(fullPath, '_index.md'))
        ? path.join(fullPath, '_index.md')
        : fs.existsSync(path.join(fullPath, 'index.md'))
        ? path.join(fullPath, 'index.md')
        : null;

      if (indexPath) {
        try {
          const content = fs.readFileSync(indexPath, 'utf8');
          const { data } = matter(content);
          if (data && String(data.tmdb_id).trim() === searchKey) {
            matchedDir = dir;
            showDirFullPath = fullPath;
            break;
          }
        } catch (e) {
          console.error(`Error reading ${indexPath}:`, e);
        }
      }
    }
  }

  if (!matchedDir || !fs.existsSync(showDirFullPath)) {
    return null;
  }

  // Read _index.md
  let indexFrontmatter: CustomTVFrontmatter = { tmdb_id: 0 };
  let indexContentHtml: string | null = null;

  const indexPath = fs.existsSync(path.join(showDirFullPath, '_index.md'))
    ? path.join(showDirFullPath, '_index.md')
    : fs.existsSync(path.join(showDirFullPath, 'index.md'))
    ? path.join(showDirFullPath, 'index.md')
    : null;

  if (indexPath) {
    try {
      const indexRaw = fs.readFileSync(indexPath, 'utf8');
      const { data, content } = matter(indexRaw);
      indexFrontmatter = data as CustomTVFrontmatter;
      if (content && content.trim()) {
        indexContentHtml = await marked.parse(content);
      }
    } catch (e) {
      console.error(`Error parsing ${indexPath}:`, e);
    }
  }

  // Scan for episodes and seasons
  const seasonsMap = new Map<number | null, CustomEpisode[]>();
  const allEpisodes: CustomEpisode[] = [];
  let hasSeasons = false;

  try {
    const entries = fs.readdirSync(showDirFullPath, { withFileTypes: true });

    // Check if subdirectories exist (Season folders like s1, s2, season-1)
    const subDirs = entries.filter((e) => e.isDirectory());

    if (subDirs.length > 0) {
      hasSeasons = true;

      // Sort season folders (e.g. s1, s2, s3)
      subDirs.sort((a, b) => {
        const sA = parseSeasonNumber(a.name) || 0;
        const sB = parseSeasonNumber(b.name) || 0;
        return sA - sB;
      });

      for (const sDir of subDirs) {
        const seasonNumber = parseSeasonNumber(sDir.name);
        const seasonDirPath = path.join(showDirFullPath, sDir.name);
        const epFiles = fs
          .readdirSync(seasonDirPath)
          .filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));

        // Sort episode files (e.g. e1, e2, e3)
        epFiles.sort((a, b) => parseEpisodeNumber(a, 0) - parseEpisodeNumber(b, 0));

        const seasonEpisodes: CustomEpisode[] = [];

        for (let index = 0; index < epFiles.length; index++) {
          const file = epFiles[index];
          try {
            const filePath = path.join(seasonDirPath, file);
            const raw = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(raw);
            const frontmatter = data as CustomEpisodeFrontmatter;

            const epNum = frontmatter.episode_number !== undefined
              ? Number(frontmatter.episode_number)
              : parseEpisodeNumber(file, index);

            const seasonNum = frontmatter.season_number !== undefined
              ? Number(frontmatter.season_number)
              : seasonNumber;

            const baseName = file.replace(/\.(md|markdown)$/i, '');
            const epLabel = seasonNum !== null ? `S${seasonNum}:E${epNum}` : `EP ${epNum < 10 ? '0' + epNum : epNum}`;
            const title = frontmatter.title?.trim() || `Episode ${epNum}`;
            const videoUrl = frontmatter.videourl || frontmatter.video_url || null;
            const imageUrl = frontmatter.image_url || null;
            const overview = (frontmatter.deskripsi || frontmatter.description || '').trim();
            const rating = frontmatter.rating !== undefined && frontmatter.rating !== null ? Number(frontmatter.rating) : null;
            const duration = frontmatter.duration || null;
            const contentHtml = content && content.trim() ? await marked.parse(content) : null;
            const urlPath = `/tv/${matchedDir}/${sDir.name}/${baseName}`;

            const customEp: CustomEpisode = {
              slug: `${sDir.name}/${baseName}`,
              filename: file,
              seasonNumber: seasonNum,
              seasonFolder: sDir.name,
              episodeNumber: epNum,
              episodeLabel: epLabel,
              title,
              videoUrl,
              imageUrl,
              overview,
              rating,
              duration,
              contentHtml,
              rawContent: content,
              urlPath,
            };

            seasonEpisodes.push(customEp);
            allEpisodes.push(customEp);
          } catch (err) {
            console.error(`Error parsing episode file ${file}:`, err);
          }
        }

        seasonsMap.set(seasonNumber, seasonEpisodes);
      }
    } else {
      // Flat episodes directly inside show folder (no season folders)
      hasSeasons = false;
      const epFiles = entries
        .filter(
          (e) =>
            e.isFile() &&
            (e.name.endsWith('.md') || e.name.endsWith('.markdown')) &&
            e.name !== '_index.md' &&
            e.name !== 'index.md'
        )
        .map((e) => e.name);

      epFiles.sort((a, b) => parseEpisodeNumber(a, 0) - parseEpisodeNumber(b, 0));

      const flatEpisodes: CustomEpisode[] = [];

      for (let index = 0; index < epFiles.length; index++) {
        const file = epFiles[index];
        try {
          const filePath = path.join(showDirFullPath, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const { data, content } = matter(raw);
          const frontmatter = data as CustomEpisodeFrontmatter;

          const epNum = frontmatter.episode_number !== undefined
            ? Number(frontmatter.episode_number)
            : parseEpisodeNumber(file, index);

          const baseName = file.replace(/\.(md|markdown)$/i, '');
          const epLabel = `EP ${epNum < 10 ? '0' + epNum : epNum}`;
          const title = frontmatter.title?.trim() || `Episode ${epNum}`;
          const videoUrl = frontmatter.videourl || frontmatter.video_url || null;
          const imageUrl = frontmatter.image_url || null;
          const overview = (frontmatter.deskripsi || frontmatter.description || '').trim();
          const rating = frontmatter.rating !== undefined && frontmatter.rating !== null ? Number(frontmatter.rating) : null;
          const duration = frontmatter.duration || null;
          const contentHtml = content && content.trim() ? await marked.parse(content) : null;
          const urlPath = `/tv/${matchedDir}/${baseName}`;

          const customEp: CustomEpisode = {
            slug: baseName,
            filename: file,
            seasonNumber: null,
            seasonFolder: null,
            episodeNumber: epNum,
            episodeLabel: epLabel,
            title,
            videoUrl,
            imageUrl,
            overview,
            rating,
            duration,
            contentHtml,
            rawContent: content,
            urlPath,
          };

          flatEpisodes.push(customEp);
          allEpisodes.push(customEp);
        } catch (err) {
          console.error(`Error parsing flat episode ${file}:`, err);
        }
      }

      seasonsMap.set(null, flatEpisodes);
    }
  } catch (err) {
    console.error(`Error reading TV show directory ${showDirFullPath}:`, err);
  }

  // Format seasons array
  const seasons: CustomSeason[] = [];
  seasonsMap.forEach((eps, seasonNum) => {
    seasons.push({
      seasonNumber: seasonNum,
      seasonName: seasonNum !== null ? `Season ${seasonNum}` : 'Semua Episode',
      seasonFolder: eps[0]?.seasonFolder || null,
      episodes: eps,
    });
  });

  return {
    showSlug: matchedDir,
    hasSeasons,
    frontmatter: indexFrontmatter,
    contentHtml: indexContentHtml,
    seasons,
    allEpisodes,
  };
}

/**
 * Fetches TMDB TV Show details and merges with custom markdown TV data and active episode.
 */
export async function getTVShowDetailsWithCustomOverride(
  slugArray: string[]
): Promise<MergedTVShowDetail | null> {
  if (!slugArray || slugArray.length === 0) return null;

  const showSlugOrId = slugArray[0];
  const customTV = await getCustomTVShowBySlug(showSlugOrId);

  let tmdbId: number;

  if (customTV) {
    tmdbId = Number(customTV.frontmatter.tmdb_id);
    if (!tmdbId || isNaN(tmdbId)) {
      throw new Error(`Custom TV show '${customTV.showSlug}' missing valid tmdb_id in _index.md`);
    }
  } else {
    tmdbId = Number(showSlugOrId);
    if (!tmdbId || isNaN(tmdbId)) {
      return null;
    }
  }

  // Fetch baseline TMDB details
  const tmdbShow = await getTVShowDetails(tmdbId);
  if (!tmdbShow) return null;

  if (!customTV) {
    return {
      ...tmdbShow,
      isCustomTV: false,
      hasSeasons: Boolean(tmdbShow.number_of_seasons && tmdbShow.number_of_seasons > 0),
      seasonsList: [],
      allEpisodes: [],
      activeEpisode: null,
    };
  }

  const { frontmatter, contentHtml, seasons, allEpisodes, hasSeasons } = customTV;

  // Overrides from frontmatter
  const overriddenName = frontmatter.title && frontmatter.title.trim() !== ''
    ? frontmatter.title
    : tmdbShow.name;

  const overriddenRating = frontmatter.rating !== undefined && frontmatter.rating !== null && frontmatter.rating !== ''
    ? Number(frontmatter.rating)
    : tmdbShow.vote_average;

  const overriddenOverview = (frontmatter.deskripsi || frontmatter.description)?.trim() || tmdbShow.overview;
  const overriddenTagline = frontmatter.tagline?.trim() || tmdbShow.tagline;
  const customImageUrl = frontmatter.image_url || null;

  // Determine active episode
  let activeEpisode: CustomEpisode | null = null;

  if (slugArray.length > 1) {
    const episodePathSegments = slugArray.slice(1);
    const joinedEpisodePath = episodePathSegments.join('/').toLowerCase().replace(/\.(md|markdown)$/i, '');

    activeEpisode =
      allEpisodes.find(
        (ep) =>
          ep.slug.toLowerCase() === joinedEpisodePath ||
          ep.slug.toLowerCase().endsWith(joinedEpisodePath) ||
          ep.filename.toLowerCase().replace(/\.(md|markdown)$/i, '') === joinedEpisodePath
      ) || null;
  }

  // If on overview page without episode path, default activeEpisode to first episode if available
  if (!activeEpisode && allEpisodes.length > 0) {
    activeEpisode = allEpisodes[0];
  }

  return {
    ...tmdbShow,
    name: overriddenName,
    vote_average: overriddenRating,
    overview: overriddenOverview,
    tagline: overriddenTagline,
    number_of_seasons: hasSeasons ? seasons.length : (tmdbShow.number_of_seasons || 1),
    number_of_episodes: allEpisodes.length > 0 ? allEpisodes.length : (tmdbShow.number_of_episodes || 0),
    isCustomTV: true,
    customSlug: customTV.showSlug,
    customImageUrl,
    customContentHtml: contentHtml,
    hasSeasons,
    seasonsList: seasons,
    allEpisodes,
    activeEpisode,
  };
}

/**
 * Returns all custom markdown TV shows that have `featured: true` in their _index.md.
 */
export async function getAllFeaturedCustomTV(): Promise<any[]> {
  const showSlugs = getAllCustomTVShowDirs();
  const featuredShows: any[] = [];

  for (const slug of showSlugs) {
    try {
      const customData = await getCustomTVShowBySlug(slug);
      if (customData && (customData.frontmatter.featured === true || customData.frontmatter.featured === 'true')) {
        const detail = await getTVShowDetailsWithCustomOverride([slug]);
        if (detail) {
          const firstEp = detail.allEpisodes?.[0];
          const link = firstEp?.urlPath || `/tv/${detail.customSlug || detail.id}`;
          featuredShows.push({
            id: `tv-${detail.customSlug || detail.id}`,
            title: detail.name,
            tagline: detail.tagline || undefined,
            overview: detail.overview,
            backdropUrl: detail.customImageUrl || (detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : '/placeholder-poster.jpg'),
            rating: Math.round(detail.vote_average * 10) / 10,
            year: detail.first_air_date ? new Date(detail.first_air_date).getFullYear() : '2025',
            duration: detail.number_of_episodes ? `${detail.number_of_episodes} Episodes` : undefined,
            type: 'tv' as const,
            genres: detail.genres?.map((g) => g.name) || [],
            link,
            badge: 'Featured',
          });
        }
      }
    } catch (err) {
      console.error(`Error loading featured custom TV for ${slug}:`, err);
    }
  }

  return featuredShows;
}
