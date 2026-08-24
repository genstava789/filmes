/**
 * Central Configuration for LeviStream Web Application
 * Edit properties here to customize website branding, metadata, featured hero items, and links.
 */

export interface FeaturedItem {
  id: string | number;
  title: string;
  tagline?: string;
  overview: string;
  backdropUrl: string;
  rating: number;
  year?: string | number;
  duration?: string;
  type?: 'movie' | 'tv';
  genres?: string[];
  link: string;
  badge?: string;
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

  // 3 Customizable Featured Hero items for the carousel
  featuredItems: [
    {
      id: 'mutiny-custom',
      title: 'Mutiny',
      tagline: 'Trust No One. Fight Everyone.',
      overview:
        'Ketika seorang personel pasukan khusus terjebak dalam konspirasi pengkhianatan tingkat tinggi, ia harus bertarung untuk membersihkan namanya dan mengungkap dalang di balik pemberontakan mematikan.',
      backdropUrl:
        'https://image.tmdb.org/t/p/w1280/6Xkdd0dMhQo2w93hG7G33xK4gH7.jpg',
      rating: 9.8,
      year: '2025',
      duration: '1h 54m',
      type: 'movie',
      genres: ['Action', 'Thriller', 'Crime'],
      link: '/movie/movie',
      badge: '🔥 Trending #1 Edition',
    },
    {
      id: 'lanterns-dc',
      title: 'Lanterns',
      tagline: 'In Brightest Day, In Blackest Night.',
      overview:
        'Dua polisi antariksa legendaris, perwira veteran Hal Jordan dan rekrutan baru John Stewart, menyelidiki misteri konspirasi pembunuhan kelam di jantung bumi yang membuka ancaman kosmik mengerikan.',
      backdropUrl:
        'https://image.tmdb.org/t/p/w1280/mQ9m8xQ04N08qM8x8dM8h7Q04N0.jpg',
      rating: 9.7,
      year: '2025',
      duration: '8 Episodes',
      type: 'tv',
      genres: ['Sci-Fi', 'Mystery', 'Crime'],
      link: '/tv/lanterns/s1/e1',
      badge: '⚡ DC Universe Exclusive',
    },
    {
      id: 'bleach-thousand-year',
      title: 'Bleach: Thousand-Year Blood War',
      tagline: 'The Final War of Souls Begins.',
      overview:
        'Konflik ribuan tahun antara Shinigami dan Quincy mencapai klimaks saat Yhwach memimpin invasi Wandenreich ke Soul Society. Ichigo Kurosaki harus bangkit melampaui batas kekuatannya.',
      backdropUrl:
        'https://image.tmdb.org/t/p/w1280/7zpM6zQGg6w3x0N9x0w7Z4q04N0.jpg',
      rating: 9.5,
      year: '2025',
      duration: 'Part 3 (Conflict)',
      type: 'tv',
      genres: ['Animation', 'Action', 'Fantasy'],
      link: '/tv/lanterns/s1/e1',
      badge: '✦ Anime Hit Series',
    },
  ] as FeaturedItem[],

  links: {
    github: 'https://github.com/genstava789/filmes',
  },
};

export type SiteConfig = typeof siteConfig;
export default siteConfig;
