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
 */
export function getMovieUrl(movie: {
  id?: number | string;
  tmdbId?: number | string;
  title?: string;
  customSlug?: string;
  link?: string;
}): string {
  // If a valid custom link is directly defined (and not outdated '/movie/movie')
  if (movie.link && movie.link !== '/movie/movie' && !movie.link.startsWith('http')) {
    return movie.link;
  }

  const id = movie.tmdbId || movie.id;
  const title = movie.title || '';
  const customSlug = movie.customSlug;

  if (siteConfig.useTitleSlug) {
    // If it has a named custom markdown slug other than generic "movie"
    if (customSlug && customSlug !== 'movie') {
      return `/movie/${customSlug}`;
    }
    if (title) {
      const slug = slugify(title);
      if (slug) {
        return id ? `/movie/${slug}-${id}` : `/movie/${slug}`;
      }
    }
  }

  // Fallback / ID mode
  if (customSlug && customSlug !== 'movie') {
    return `/movie/${customSlug}`;
  }
  return id ? `/movie/${id}` : '/movie';
}

/**
 * Returns the proper URL for a TV show according to `siteConfig.useTitleSlug`.
 */
export function getTVUrl(show: {
  id?: number | string;
  tmdbId?: number | string;
  name?: string;
  title?: string;
  customSlug?: string;
  link?: string;
}): string {
  if (show.link && !show.link.startsWith('http')) {
    return show.link;
  }

  const id = show.tmdbId || show.id;
  const name = show.name || show.title || '';
  const customSlug = show.customSlug;

  if (customSlug) {
    return `/tv/${customSlug}`;
  }

  if (siteConfig.useTitleSlug && name) {
    const slug = slugify(name);
    if (slug) {
      return id ? `/tv/${slug}-${id}` : `/tv/${slug}`;
    }
  }

  return id ? `/tv/${id}` : '/tv';
}
