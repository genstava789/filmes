import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import BackToTop from '@/components/BackToTop';
import { getGenres } from '@/lib/tmdb';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Filmanesia - Watch Movies & TV Shows Online',
  description:
    'Discover and explore thousands of movies and TV shows. Find trending titles, top-rated classics, and everything in between on Filmanesia.',
  keywords: 'movies, TV shows, streaming, TMDB, cinema, watch online',
  openGraph: {
    title: 'Filmanesia - Watch Movies & TV Shows Online',
    description: 'Discover and explore thousands of movies and TV shows.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let genres: import('@/types/tmdb').Genre[] = [];
  try {
    genres = await getGenres();
  } catch {
    genres = [];
  }

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${plusJakartaSans.className}`}>
      <body
        style={{
          backgroundColor: '#050816',
          color: '#f1f5f9',
          minHeight: '100vh',
        }}
      >
        <AppLayout genres={genres}>
          {children}
        </AppLayout>
        <BackToTop />
      </body>
    </html>
  );
}
