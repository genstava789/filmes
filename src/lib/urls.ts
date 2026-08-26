import siteConfig from '@/config';

/**
 * Converts a string into a clean, URL-friendly kebab-case slug.
 * E.g. "Deadpool & Wolverine (2024)" -> "deadpool-and-wolverine"
 */
export function slugify(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '') // remove parenthesized expressions like (2026), (Edition)
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric chars except hyphen & space
    .replace(/\s+/g, '-') // collapse spaces into hyphen
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

/**
 * Returns the proper URL for a movie according to `siteConfig.useTitleSlug`.
 * Formats as: /movie/mutiny-2026
 */
export function getMovieUrl(movie: {
  id?: number | string | null;
  tmdbId?: number | string | null;
  title?: string | null;
  release_date?: string | null;
  year?: number | string | null;
  customSlug?: string | null;
  link?: string | null;
}): string {
  // If a valid custom link is directly defined (and not outdated '/movie/movie')
  if (movie.link && movie.link !== '/movie/movie' && !movie.link.startsWith('http')) {
    return movie.link;
  }

  const id = movie.tmdbId || movie.id;
  const title = movie.title || '';
  const customSlug = movie.customSlug;
  const rawYear = movie.year || (movie.release_date ? new Date(movie.release_date).getFullYear() : null);
  const year = rawYear && !isNaN(Number(rawYear)) ? Number(rawYear) : null;

  // Check if customSlug is a generic placeholder or filename rather than an explicit custom route
  const isGenericSlug =
    !customSlug ||
    customSlug === 'movie' ||
    customSlug === 'movie.md' ||
    /^movie-\d+$/i.test(customSlug) ||
    customSlug === String(id);

  if (siteConfig.useTitleSlug) {
    if (title) {
      const slug = slugify(title);
      if (slug) {
        return year ? `/movie/${slug}-${year}` : `/movie/${slug}`;
      }
    }
    if (customSlug && !isGenericSlug) {
      return `/movie/${customSlug}`;
    }
  }

  // Fallback / ID mode
  if (customSlug && !isGenericSlug) {
    return `/movie/${customSlug}`;
  }
  return id ? `/movie/${id}` : (customSlug ? `/movie/${customSlug}` : '/movie');
}

/**
 * Returns the proper URL for a TV show according to `siteConfig.useTitleSlug`.
 * Formats as: /tv/lanterns-2026
 */
export function getTVUrl(show: {
  id?: number | string | null;
  tmdbId?: number | string | null;
  name?: string | null;
  title?: string | null;
  first_air_date?: string | null;
  year?: number | string | null;
  customSlug?: string | null;
  link?: string | null;
}): string {
  if (show.link && !show.link.startsWith('http')) {
    return show.link;
  }

  const id = show.tmdbId || show.id;
  const name = show.name || show.title || '';
  const customSlug = show.customSlug;
  const rawYear = show.year || (show.first_air_date ? new Date(show.first_air_date).getFullYear() : null);
  const year = rawYear && !isNaN(Number(rawYear)) ? Number(rawYear) : null;

  const isGenericSlug =
    !customSlug ||
    customSlug === 'tv' ||
    /^tv-\d+$/i.test(customSlug) ||
    customSlug === String(id);

  if (siteConfig.useTitleSlug) {
    if (name) {
      const slug = slugify(name);
      if (slug) {
        return year ? `/tv/${slug}-${year}` : `/tv/${slug}`;
      }
    }
    if (customSlug && !isGenericSlug) {
      return year ? `/tv/${customSlug}-${year}` : `/tv/${customSlug}`;
    }
  }

  if (customSlug && !isGenericSlug) {
    return `/tv/${customSlug}`;
  }
  return id ? `/tv/${id}` : (customSlug ? `/tv/${customSlug}` : '/tv');
}
