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
  url: 'https://levistream.vercel.app',
  logoUrl: 'https://levistream.vercel.app/logo.png',
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
      link: '/movie/movie',
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

  links: {
    github: 'https://github.com/genstava789/filmes',
  },
};

export type SiteConfig = typeof siteConfig;
export default siteConfig;
