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

  // When enabled (true), URLs for movies and TV shows use clean title slugs (e.g. /movie/mutiny-1288445 or /tv/stranger-things-66732)
  // When disabled (false), URLs use TMDB IDs (e.g. /movie/1288445 or /tv/95350)
  // Note: Dual routing is always active, meaning both ID and Title slug URLs will always work for users!
  useTitleSlug: true,

  // Auto-slide interval for Featured Hero (in seconds)
  heroIntervalSeconds: 6,

  // Customizable Featured Hero items for the carousel.
  // When tmdbId is provided, any missing fields (title, overview, poster/backdrop, rating, duration, genres, etc.)
  // are automatically fetched from TMDB API while respecting your custom overrides!
  featuredItems: [
    {
      id: 'mutiny-custom',
      tmdbId: 1288445,
      type: 'movie',
      title: 'Mutiny',
      tagline: 'Trust No One. Fight Everyone.',
      badge: 'Featured',
    },
    {
      id: 'lanterns-dc',
      tmdbId: 95350,
      type: 'tv',
      title: 'Lanterns',
      tagline: 'In Brightest Day, In Blackest Night.',
      badge: 'Featured',
      link: '/tv/lanterns/s1/e1',
    },
    {
      id: 'bleach-thousand-year',
      tmdbId: 30984,
      type: 'tv',
      title: 'Bleach: Thousand-Year Blood War',
      tagline: 'The Final War of Souls Begins.',
      duration: 'Part 3',
      badge: 'Featured',
    },
  ] as FeaturedItem[],

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

