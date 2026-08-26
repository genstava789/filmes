/**
 * Central Configuration for LeviStream Web Application
 * Edit properties here to customize website branding, metadata, featured hero items, and links.
 */

export interface FeaturedItem {
  id?: string | number;
  tmdbId?: number | string;
  title?: string;
  tagline?: string;
  overview?: string;
  backdropUrl?: string;
  posterUrl?: string;
  rating?: number;
  year?: string | number;
  duration?: string;
  type?: 'movie' | 'tv';
  genres?: string[];
  link?: string;
  badge?: string;
  featured?: boolean | string;
  isCustom?: boolean;
}

export const siteConfig = {
  name: 'LeviStream',
  nameUpper: 'LEVISTREAM',
  tagline: 'Watch Movies & TV Shows Online',
  description:
    'Discover and explore thousands of movies and TV shows. Find trending titles, top-rated classics, and everything in between on LeviStream.',
  url: 'https://filmes-xi-seven.vercel.app',
  logoUrl: 'https://filmes-xi-seven.vercel.app/logo.png',
  keywords: [
    'movies',
    'TV shows',
    'streaming',
    'TMDB',
    'cinema',
    'watch online',
    'levistream',
    'anime',
    'kdrama',
  ],
  author: 'LeviStream',
  copyright: 'LeviStream',
  footerText: 'All rights reserved.',

  // When enabled (true), video titles for generic scrapers & Rave.io use the format: "Judul (Tahun) | LeviStream"
  // When disabled (false), video titles will be: "Judul (Tahun)"
  useCreditTitleForRave: false,

  // When enabled (true), URLs for movies and TV shows use clean title-year slugs (e.g. /movie/mutiny-2026 or /tv/lanterns-2026)
  // When disabled (false), URLs use TMDB IDs (e.g. /movie/1288445 or /tv/95350)
  // Note: Multi-routing is always active, meaning year slugs, ID slugs, and legacy URLs all continue to work seamlessly!
  useTitleSlug: true,

  // Auto-slide interval for Featured Hero (in seconds)
  heroIntervalSeconds: 6,

  // Customizable Featured Hero items for the carousel.
  // When empty, items are dynamically sourced from custom markdown files with `featured: true` in frontmatter,
  // and dynamically filled with trending titles.
  featuredItems: [] as FeaturedItem[],

  // Customizable Section Headings for Homepage
  homepageSections: {
    browseGenres: 'Browse by Genre',
    trending: 'Trending This Week',
    recentlyAdded: 'Recently Added',
    popularMovies: 'Popular Movies',
    topRated: 'Top Rated',
    trendingTV: 'Trending TV Shows',
  },

  // Customizable Section Headings for TV Page
  tvSections: {
    pageTitle: 'TV Shows',
    pageSubtitle: 'Discover the best series',
    browseGenres: 'Browse Series by Genre',
    trending: 'Trending This Week',
    recentlyAdded: 'Recently Added',
    popular: 'Popular TV Shows',
    topRated: 'Top Rated Series',
  },

  links: {
    github: 'https://github.com/genstava789/filmes',
  },
};

export type SiteConfig = typeof siteConfig;
export default siteConfig;

