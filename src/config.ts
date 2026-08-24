/**
 * Central Configuration for LeviStream Web Application
 * Edit properties here to customize website branding, metadata, and links.
 */

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
  links: {
    github: 'https://github.com/genstava789/filmes',
  },
};

export type SiteConfig = typeof siteConfig;
export default siteConfig;
