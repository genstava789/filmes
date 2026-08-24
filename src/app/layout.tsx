import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { getGenres } from '@/lib/tmdb';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
    <html lang="en" className={inter.className}>
      <body
        style={{
          backgroundColor: '#050816',
          color: '#f1f5f9',
          minHeight: '100vh',
        }}
      >
        {/* Desktop Sidebar */}
        <Sidebar genres={genres} />

        {/* Mobile Bottom Nav */}
        <BottomNav genres={genres} />

        {/* Main content - offset for sidebar on desktop, bottom nav on mobile */}
        <div className="lg:pl-[240px] transition-all duration-300">
          <main className="pb-20 lg:pb-0 min-h-screen">
            {children}
          </main>
          <Footer />
        </div>

        <BackToTop />
      </body>
    </html>
  );
}
