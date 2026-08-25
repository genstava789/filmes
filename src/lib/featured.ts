import { Movie, TVShow, MovieDetail, TVShowDetail } from '@/types/tmdb';
import { getMovieDetails, getTVShowDetails, getImageUrl } from '@/lib/tmdb';
import { getAllFeaturedCustomMovies, getCustomMovieTmdbMapping, getCustomMovieBySlug } from '@/lib/markdownMovies';
import { getAllFeaturedCustomTV, getCustomTVTmdbMapping, getCustomTVShowBySlug } from '@/lib/markdownTV';
import siteConfig, { FeaturedItem } from '@/config';

/**
 * Normalizes title string by stripping descriptive edition suffixes, punctuation, and extra whitespace.
 * E.g. "Mutiny (Custom Static Stream Edition)" -> "mutiny"
 *      "Lanterns (DC Studios Universe Series)" -> "lanterns"
 */
export function normalizeTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\([^)]*\)/g, '') // remove parenthesized remarks like (Custom Edition)
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Enriches a single FeaturedItem config by fetching missing metadata (rating, duration, title, poster, etc.)
 * from TMDB API if tmdbId is provided.
 */
export async function enrichConfigFeaturedItem(item: FeaturedItem): Promise<FeaturedItem> {
  const rawTmdbId = item.tmdbId !== undefined ? item.tmdbId : (typeof item.id === 'number' || (typeof item.id === 'string' && /^\d+$/.test(item.id)) ? Number(item.id) : undefined);
  const type = item.type || 'movie';

  if (!rawTmdbId) {
    // If no tmdbId provided, return item with safe fallback images
    return {
      ...item,
      id: item.id || `custom-${normalizeTitle(item.title) || 'featured'}`,
      title: item.title || 'Featured Title',
      overview: item.overview || '',
      backdropUrl: item.backdropUrl ? getImageUrl(item.backdropUrl, 'w1280') : (item.posterUrl ? getImageUrl(item.posterUrl, 'w780') : '/placeholder-poster.svg'),
      posterUrl: item.posterUrl ? getImageUrl(item.posterUrl, 'w500') : (item.backdropUrl ? getImageUrl(item.backdropUrl, 'w780') : '/placeholder-poster.svg'),
      rating: item.rating !== undefined ? item.rating : 8.5,
      year: item.year || '2025',
      badge: item.badge || 'Featured',
      link: item.link || '/',
      type,
    };
  }

  const tmdbIdNum = Number(rawTmdbId);

  // Check if a custom markdown file exists for this tmdb_id
  const movieMapping = getCustomMovieTmdbMapping();
  const tvMapping = getCustomTVTmdbMapping();
  const customMovieSlug = movieMapping[String(tmdbIdNum)]?.replace(/\.(md|markdown)$/i, '');
  const customTVSlug = tvMapping[String(tmdbIdNum)];

  let tmdbData: (MovieDetail | TVShowDetail) | null = null;
  try {
    if (type === 'tv') {
      tmdbData = await getTVShowDetails(tmdbIdNum).catch(() => null);
    } else {
      tmdbData = await getMovieDetails(tmdbIdNum).catch(() => null);
    }
  } catch (err) {
    console.error(`Error fetching TMDB data for featured item ${tmdbIdNum}:`, err);
  }

  const tmdbMovie = (type === 'movie' ? tmdbData as MovieDetail : null);
  const tmdbTV = (type === 'tv' ? tmdbData as TVShowDetail : null);

  const title = item.title && item.title.trim() !== ''
    ? item.title
    : (tmdbMovie?.title || tmdbTV?.name || 'Featured Item');

  const tagline = item.tagline !== undefined
    ? item.tagline
    : (tmdbData?.tagline || undefined);

  const overview = item.overview && item.overview.trim() !== ''
    ? item.overview
    : (tmdbData?.overview || '');

  const backdropUrl = item.backdropUrl && item.backdropUrl.trim() !== ''
    ? getImageUrl(item.backdropUrl, 'w1280')
    : (tmdbData?.backdrop_path
        ? getImageUrl(tmdbData.backdrop_path, 'w1280')
        : tmdbData?.poster_path
        ? getImageUrl(tmdbData.poster_path, 'w780')
        : '/placeholder-poster.svg');

  const posterUrl = item.posterUrl && item.posterUrl.trim() !== ''
    ? getImageUrl(item.posterUrl, 'w500')
    : (tmdbData?.poster_path
        ? getImageUrl(tmdbData.poster_path, 'w500')
        : tmdbData?.backdrop_path
        ? getImageUrl(tmdbData.backdrop_path, 'w780')
        : '/placeholder-poster.svg');

  const rating = item.rating !== undefined
    ? item.rating
    : (tmdbData?.vote_average ? Math.round(tmdbData.vote_average * 10) / 10 : 8.5);

  const year = item.year !== undefined
    ? item.year
    : (tmdbMovie?.release_date
        ? new Date(tmdbMovie.release_date).getFullYear()
        : tmdbTV?.first_air_date
        ? new Date(tmdbTV.first_air_date).getFullYear()
        : '2025');

  const duration = item.duration !== undefined
    ? item.duration
    : (tmdbMovie?.runtime
        ? `${Math.floor(tmdbMovie.runtime / 60)}h ${tmdbMovie.runtime % 60}m`
        : tmdbTV?.number_of_episodes
        ? `${tmdbTV.number_of_episodes} Episodes`
        : undefined);

  const genres = item.genres && item.genres.length > 0
    ? item.genres
    : (tmdbData?.genres?.map((g) => g.name) || []);

  const defaultLink = type === 'tv'
    ? (customTVSlug ? `/tv/${customTVSlug}` : `/tv/${tmdbIdNum}`)
    : (customMovieSlug ? `/movie/${customMovieSlug}` : `/movie/${tmdbIdNum}`);

  const link = item.link || defaultLink;

  return {
    ...item,
    id: item.id || `${type}-${tmdbIdNum}`,
    tmdbId: tmdbIdNum,
    title,
    tagline,
    overview,
    backdropUrl,
    posterUrl,
    rating,
    year,
    duration,
    genres,
    link,
    badge: item.badge || 'Featured',
    type,
  };
}

export interface GetFeaturedOptions {
  dynamicFallbackMovies?: Movie[];
  dynamicFallbackTV?: TVShow[];
  maxItems?: number;
}

/**
 * Loads, enriches, and deduplicates all featured hero items from:
 * 1. Custom Markdown Movies (featured: true)
 * 2. Custom Markdown TV Shows (featured: true)
 * 3. siteConfig.featuredItems (with automatic TMDB API fallback for missing fields when tmdbId is given)
 * 4. Dynamic TMDB items (e.g. trending movies) as fallback/fillers if needed, ensuring zero duplicates!
 */
export async function getEnrichedFeaturedItems(options: GetFeaturedOptions = {}): Promise<FeaturedItem[]> {
  const { dynamicFallbackMovies = [], dynamicFallbackTV = [], maxItems = 5 } = options;

  // 1. Fetch custom markdown featured movies and TV shows concurrently
  const [customMoviesRes, customTVRes] = await Promise.allSettled([
    getAllFeaturedCustomMovies(),
    getAllFeaturedCustomTV(),
  ]);

  const customMovies = customMoviesRes.status === 'fulfilled' ? customMoviesRes.value : [];
  const customTV = customTVRes.status === 'fulfilled' ? customTVRes.value : [];

  // 2. Enrich configured featured items from siteConfig concurrently
  const rawConfigItems = siteConfig.featuredItems || [];
  const enrichedConfigItems = await Promise.all(
    rawConfigItems.map((item) => enrichConfigFeaturedItem(item))
  );

  // 3. Merge & Deduplicate Featured Items
  const featuredList: FeaturedItem[] = [];
  const seenTmdbIds = new Set<string>(); // e.g. "movie-1288445", "tv-95350"
  const seenTitles = new Set<string>();   // e.g. "movie:mutiny", "tv:lanterns"
  const seenLinks = new Set<string>();

  // Helper to add item uniquely or merge missing fields
  const addItem = (item: FeaturedItem) => {
    const type = item.type || 'movie';
    const tmdbKey = item.tmdbId ? `${type}-${item.tmdbId}` : null;
    const normTitle = normalizeTitle(item.title);
    const titleKey = `${type}:${normTitle}`;
    const linkKey = item.link?.toLowerCase().replace(/\/$/, '') || '';

    // Check if already in featuredList
    let existingIndex = -1;

    if (tmdbKey && seenTmdbIds.has(tmdbKey)) {
      existingIndex = featuredList.findIndex(
        (f) => f.tmdbId && `${f.type || 'movie'}-${f.tmdbId}` === tmdbKey
      );
    } else if (titleKey && seenTitles.has(titleKey)) {
      existingIndex = featuredList.findIndex(
        (f) => `${f.type || 'movie'}:${normalizeTitle(f.title)}` === titleKey
      );
    } else if (linkKey && seenLinks.has(linkKey)) {
      existingIndex = featuredList.findIndex(
        (f) => f.link?.toLowerCase().replace(/\/$/, '') === linkKey
      );
    }

    if (existingIndex >= 0) {
      // Merge missing fields into existing item rather than duplicating slide
      const existing = featuredList[existingIndex];
      featuredList[existingIndex] = {
        ...existing,
        tagline: existing.tagline || item.tagline,
        duration: existing.duration || item.duration,
        genres: existing.genres && existing.genres.length > 0 ? existing.genres : item.genres,
        backdropUrl: (existing.backdropUrl && !existing.backdropUrl.includes('placeholder')) ? existing.backdropUrl : item.backdropUrl,
        posterUrl: (existing.posterUrl && !existing.posterUrl.includes('placeholder')) ? existing.posterUrl : item.posterUrl,
      };
      return;
    }

    // New unique featured item
    if (tmdbKey) seenTmdbIds.add(tmdbKey);
    if (titleKey) seenTitles.add(titleKey);
    if (linkKey) seenLinks.add(linkKey);
    featuredList.push(item);
  };

  // Add custom markdown items first (they have custom streaming links / local files)
  for (const item of customMovies) {
    addItem(item);
  }
  for (const item of customTV) {
    addItem(item);
  }

  // Add enriched config items (e.g. from siteConfig.featuredItems)
  for (const item of enrichedConfigItems) {
    addItem(item);
  }

  // 4. If we still have fewer items than maxItems, fill with non-duplicate dynamic TMDB movies/shows
  if (featuredList.length < maxItems && dynamicFallbackMovies.length > 0) {
    for (const m of dynamicFallbackMovies) {
      if (featuredList.length >= maxItems) break;

      const tmdbKey = `movie-${m.id}`;
      const titleKey = `movie:${normalizeTitle(m.title)}`;

      // Strict condition: do NOT duplicate items that are already featured
      if (seenTmdbIds.has(tmdbKey) || seenTitles.has(titleKey)) {
        continue;
      }

      seenTmdbIds.add(tmdbKey);
      seenTitles.add(titleKey);

      const backdrop = m.backdrop_path
        ? getImageUrl(m.backdrop_path, 'w1280')
        : m.poster_path
        ? getImageUrl(m.poster_path, 'w780')
        : '/placeholder-poster.svg';

      const poster = m.poster_path
        ? getImageUrl(m.poster_path, 'w500')
        : m.backdrop_path
        ? getImageUrl(m.backdrop_path, 'w780')
        : '/placeholder-poster.svg';

      featuredList.push({
        id: `dynamic-movie-${m.id}`,
        tmdbId: m.id,
        title: m.title,
        overview: m.overview,
        backdropUrl: backdrop,
        posterUrl: poster,
        rating: Math.round(m.vote_average * 10) / 10,
        year: m.release_date ? new Date(m.release_date).getFullYear() : '2025',
        type: 'movie',
        link: `/movie/${m.id}`,
        badge: 'Featured',
      });
    }
  }

  return featuredList.slice(0, maxItems);
}
