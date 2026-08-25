import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar } from 'lucide-react';
import { getTrendingTV, getPopularTV, getTopRatedTV, getAiringTodayTV } from '@/lib/tmdb';
import { getImageUrl } from '@/lib/tmdb';
import MovieRow from '@/components/MovieRow';
import { TVShow } from '@/types/tmdb';

import siteConfig from '@/config';

export const metadata: Metadata = {
  title: `TV Shows - ${siteConfig.name}`,
  description: `Discover trending and popular TV shows on ${siteConfig.name}.`,
};

export const revalidate = 3600;

function TVHero({ show }: { show: TVShow }) {
  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : '';
  const rating = Math.round(show.vote_average * 10) / 10;
  const imagePath = show.backdrop_path || show.poster_path;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'clamp(400px, 70vh, 700px)' }}>
      {imagePath && (
        <div className="absolute inset-0">
          <Image
            src={getImageUrl(imagePath, 'w1280')}
            alt={show.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(5,8,22,0.95) 0%, rgba(5,8,22,0.7) 40%, rgba(5,8,22,0.2) 70%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(5,8,22,1) 0%, rgba(5,8,22,0.4) 40%, transparent 70%)',
        }}
      />

      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl" style={{ animation: 'slideUp 0.8s ease-out forwards' }}>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{
                background: 'rgba(236,72,153,0.15)',
                border: '1px solid rgba(236,72,153,0.4)',
                color: '#ec4899',
              }}
            >
              📺 Trending TV
            </span>

            <h1
              className="text-4xl sm:text-5xl font-black leading-tight mb-4"
              style={{ color: '#f1f5f9' }}
            >
              {show.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{
                  background: rating >= 7 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                  border: `1px solid ${rating >= 7 ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.4)'}`,
                  color: rating >= 7 ? '#22c55e' : '#eab308',
                }}
              >
                <Star size={14} fill="currentColor" />
                {rating.toFixed(1)}
              </div>
              {year && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                >
                  <Calendar size={13} />
                  {year}
                </div>
              )}
            </div>

            <p className="text-base leading-relaxed mb-6 line-clamp-3" style={{ color: '#94a3b8' }}>
              {show.overview}
            </p>

            <Link
              href={`/tv/${show.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                color: 'white',
                boxShadow: '0 0 20px rgba(236,72,153,0.4)',
              }}
            >
              View Details
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #050816)' }}
      />
    </div>
  );
}

export default async function TVPage() {
  const [trendingData, popularData, topRatedData, airingData] = await Promise.allSettled([
    getTrendingTV('week'),
    getPopularTV(1),
    getTopRatedTV(1),
    getAiringTodayTV(1),
  ]);

  const trending = trendingData.status === 'fulfilled' ? trendingData.value.results : [];
  const popular = popularData.status === 'fulfilled' ? popularData.value.results : [];
  const topRated = topRatedData.status === 'fulfilled' ? topRatedData.value.results : [];
  const airingToday = airingData.status === 'fulfilled' ? airingData.value.results : [];

  const featuredShow = trending[0] || popular[0];

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* Hero */}
      {featuredShow && <TVHero show={featuredShow} />}

      {/* Content */}
      <div className="relative z-10 space-y-12 pb-12" style={{ marginTop: '-2rem' }}>
        {/* Page title */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: 'rgba(236,72,153,0.08)',
              border: '1px solid rgba(236,72,153,0.2)',
            }}
          >
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
                {siteConfig.tvSections?.pageTitle || 'TV Shows'}
              </h2>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {siteConfig.tvSections?.pageSubtitle || 'Discover the best series'}
              </p>
            </div>
          </div>
        </div>

        {/* Trending TV */}
        {trending.length > 0 && (
          <MovieRow
            title={siteConfig.tvSections?.trending || 'Trending This Week'}
            items={trending}
            type="tv"
          />
        )}

        {/* Airing Today */}
        {airingToday.length > 0 && (
          <MovieRow
            title={siteConfig.tvSections?.airingToday || 'Airing Today'}
            items={airingToday}
            type="tv"
          />
        )}

        {/* Popular TV */}
        {popular.length > 0 && (
          <MovieRow
            title={siteConfig.tvSections?.popular || 'Popular TV Shows'}
            items={popular}
            type="tv"
          />
        )}

        {/* Top Rated TV */}
        {topRated.length > 0 && (
          <MovieRow
            title={siteConfig.tvSections?.topRated || 'Top Rated Series'}
            items={topRated}
            type="tv"
          />
        )}
      </div>
    </div>
  );
}
