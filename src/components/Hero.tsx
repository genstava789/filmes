'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Movie, TVShow, Genre } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';
import siteConfig, { FeaturedItem } from '@/config';
import { getMovieUrl, getTVUrl } from '@/lib/urls';

interface HeroProps {
  movie?: Movie;
  movies?: Movie[];
  tvShow?: TVShow;
  tvShows?: TVShow[];
  genres?: Genre[];
  customFeaturedItems?: FeaturedItem[];
  type?: 'movie' | 'tv';
  buttonGradient?: string;
  badgeText?: string;
}

export default function Hero({
  movie,
  movies = [],
  tvShow,
  tvShows = [],
  genres = [],
  customFeaturedItems,
  type = 'movie',
  buttonGradient,
  badgeText,
}: HeroProps) {
  const isTV = type === 'tv' || (tvShows && tvShows.length > 0) || Boolean(tvShow);

  // Build items list: strictly prioritize customFeaturedItems if passed
  const items: FeaturedItem[] = React.useMemo(() => {
    if (customFeaturedItems !== undefined) {
      return customFeaturedItems;
    }

    if (siteConfig.featuredItems && siteConfig.featuredItems.length > 0 && !isTV) {
      return siteConfig.featuredItems;
    }

    // Fallback using incoming movies or tv shows (only if customFeaturedItems was not provided)
    const sourceItems = isTV
      ? (tvShows && tvShows.length > 0 ? tvShows.slice(0, 5) : tvShow ? [tvShow] : [])
      : (movies && movies.length > 0 ? movies.slice(0, 5) : movie ? [movie] : []);

    return (sourceItems as any[]).map((m) => {
      const itemGenres = genres.filter((g) => m.genre_ids?.includes(g.id)).map((g) => g.name);
      const backdrop = m.backdrop_path
        ? getImageUrl(m.backdrop_path, 'w1280')
        : m.poster_path
        ? getImageUrl(m.poster_path, 'w780')
        : '/placeholder-poster.svg';
      const poster = m.poster_path
        ? getImageUrl(m.poster_path, 'w500')
        : m.backdrop_path
        ? getImageUrl(m.backdrop_path, 'w780')
        : '/placeholder-poster.svg';

      const itemTitle = m.title || m.name || 'Featured';
      const itemYear = m.release_date
        ? new Date(m.release_date).getFullYear()
        : m.first_air_date
        ? new Date(m.first_air_date).getFullYear()
        : '2025';
      const itemLink = isTV ? getTVUrl(m) : getMovieUrl(m);

      return {
        id: m.id,
        tmdbId: m.id,
        title: itemTitle,
        overview: m.overview,
        backdropUrl: backdrop,
        posterUrl: poster,
        rating: Math.round((m.vote_average || 8) * 10) / 10,
        year: itemYear,
        type: isTV ? ('tv' as const) : ('movie' as const),
        genres: itemGenres.slice(0, 3),
        link: itemLink,
        badge: badgeText || (isTV ? 'Featured Series' : 'Featured'),
      };
    });
  }, [customFeaturedItems, movies, movie, tvShows, tvShow, genres, isTV, badgeText]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch Swipe Gesture Tracking
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const total = items.length;
  const currentItem = items[currentIndex] || items[0];

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // Min swipe distance in px

    if (diff > minSwipeDistance) {
      nextSlide(); // Swiped left -> next
    } else if (diff < -minSwipeDistance) {
      prevSlide(); // Swiped right -> prev
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Auto-slide effect
  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const intervalMs = (siteConfig.heroIntervalSeconds || 6) * 1000;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, nextSlide]);

  if (!currentItem) return null;

  const btnBg =
    buttonGradient ||
    (isTV
      ? 'linear-gradient(135deg, #ec4899, #7c3aed)'
      : 'linear-gradient(135deg, #06b6d4, #7c3aed)');
  const btnShadow = isTV
    ? '0 0 25px rgba(236,72,153,0.45)'
    : '0 0 25px rgba(6,182,212,0.45)';

  const badgeBg = isTV
    ? 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(124,58,237,0.25))'
    : 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(124,58,237,0.25))';
  const badgeBorder = isTV
    ? '1px solid rgba(236,72,153,0.45)'
    : '1px solid rgba(6,182,212,0.45)';
  const badgeColor = isTV ? '#ec4899' : '#06b6d4';
  const badgeShadow = isTV
    ? '0 0 16px rgba(236,72,153,0.3)'
    : '0 0 16px rgba(6,182,212,0.3)';

  return (
    <section
      className="relative w-full max-w-full aspect-[16/9] overflow-hidden select-none touch-pan-y"
      style={{ overscrollBehaviorX: 'none' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Background Slides with Zero Zoom & Clean Crossfade ── */}
      {items.map((item, idx) => {
        const isCurrent = idx === currentIndex;
        const bgImage = item.backdropUrl || item.posterUrl || '/placeholder-poster.svg';
        return (
          <div
            key={item.id || idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isCurrent ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
            }`}
          >
            {bgImage && (
              <div className="relative w-full h-full">
                <Image
                  src={bgImage}
                  alt={item.title || 'Featured item'}
                  fill
                  priority={idx === 0}
                  quality={95}
                  className="object-cover object-center"
                  sizes="100vw"
                />
              </div>
            )}
          </div>
        );
      })}

      {/* ── Subtle Backdrop Blur & Ambient Glass Glow Layer (Movies Anywhere style) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none backdrop-blur-[1px]"
        style={{
          background:
            'radial-gradient(ellipse at 15% 85%, rgba(5,8,22,0.55) 0%, transparent 60%)',
        }}
      />

      {/* ── Gradient Overlays (Cinematic Seamless Blend into Body Background #050816) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(5,8,22,1) 0%, rgba(5,8,22,0.85) 15%, rgba(5,8,22,0.35) 40%, rgba(5,8,22,0.05) 70%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none hidden xs:block"
        style={{
          background:
            'linear-gradient(to right, rgba(5,8,22,0.92) 0%, rgba(5,8,22,0.6) 30%, rgba(5,8,22,0.15) 60%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,8,22,0.5) 0%, transparent 25%)',
        }}
      />

      {/* ── Hero Content (Movies Anywhere 16:9 Glassmorphic Layout) ── */}
      <div className="relative z-20 h-full flex flex-col justify-end px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pb-2.5 xs:pb-3.5 sm:pb-5 md:pb-7 lg:pb-8">
        <div className="w-full flex items-end justify-between gap-3 sm:gap-6">

          {/* ── Left Column: Title -> Badges -> Tonton Button -> Indicator Dots ── */}
          <div className="max-w-[72%] xs:max-w-[70%] sm:max-w-xl md:max-w-2xl flex flex-col items-start">
            {/* Title */}
            <h1
              className="text-xs xs:text-sm sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)] line-clamp-1 xs:line-clamp-2 mb-1 xs:mb-1.5 sm:mb-2.5"
              style={{
                textShadow: '0 2px 20px rgba(0,0,0,0.95)',
              }}
            >
              {currentItem.title}
            </h1>

            {/* Badges Row (Genre badges removed, clean glassmorphic tags) */}
            <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 sm:gap-2 mb-1.5 xs:mb-2 sm:mb-3 text-[8.5px] xs:text-[9.5px] sm:text-xs">
              {/* Featured Badge */}
              <span
                className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg font-extrabold uppercase tracking-wider backdrop-blur-md"
                style={{
                  background: badgeBg,
                  border: badgeBorder,
                  color: badgeColor,
                  boxShadow: badgeShadow,
                }}
              >
                <Sparkles size={10} className="sm:w-[11px] sm:h-[11px] flex-shrink-0" />
                <span>{currentItem.badge || (isTV ? 'Featured Series' : 'Featured')}</span>
              </span>

              {/* HD Badge */}
              <span
                className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded font-black tracking-wider backdrop-blur-md"
                style={{
                  background: isTV ? 'rgba(236,72,153,0.15)' : 'rgba(6, 182, 212, 0.15)',
                  border: isTV ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(6, 182, 212, 0.4)',
                  color: isTV ? '#ec4899' : '#06b6d4',
                }}
              >
                HD
              </span>

              {/* Rating */}
              <div
                className="flex items-center gap-0.5 xs:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg font-bold backdrop-blur-md"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  color: '#22c55e',
                }}
              >
                <Star size={10} fill="currentColor" className="sm:w-[11px] sm:h-[11px] flex-shrink-0" />
                <span>{(currentItem.rating ?? 8.5).toFixed(1)}</span>
              </div>

              {/* Styled Year Label Badge */}
              {currentItem.year && (
                <div
                  className="flex items-center gap-0.5 xs:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg font-semibold backdrop-blur-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#e2e8f0',
                  }}
                >
                  <Calendar size={10} className={isTV ? 'text-pink-400' : 'text-cyan-400'} />
                  <span>{currentItem.year}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: Clean & Direct "Tonton" button (positioned above dots) */}
            <Link
              href={currentItem.link || '/'}
              className="inline-flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 px-3 py-1.5 xs:px-4 xs:py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 rounded-lg sm:rounded-xl font-bold text-[10.5px] xs:text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg mb-1.5 xs:mb-2 sm:mb-3"
              style={{
                background: btnBg,
                color: 'white',
                boxShadow: btnShadow,
              }}
            >
              <Play size={12} fill="white" className="xs:w-[14px] xs:h-[14px] sm:w-[16px] sm:h-[16px]" />
              <span>Tonton Sekarang</span>
            </Link>

            {/* Minimalist & Sleek Indicator Dots on Left (Below Tonton Button) */}
            {total > 1 && (
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 pt-0.5">
                {items.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      title={`Slide ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer focus:outline-none rounded-full ${
                        isCurrent
                          ? `w-3.5 xs:w-4 sm:w-6 h-1 xs:h-1.5 sm:h-2 opacity-100 ${isTV ? 'shadow-[0_0_10px_rgba(236,72,153,0.8)]' : 'shadow-[0_0_10px_rgba(6,182,212,0.8)]'}`
                          : 'w-1 xs:w-1.5 sm:w-2 h-1 xs:h-1.5 sm:h-2 bg-white/30 hover:bg-white/60'
                      }`}
                      style={{
                        background: isCurrent ? btnBg : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}

          </div>

          {/* ── Right Column: Swiper Navigation Arrows on Right ── */}
          {total > 1 && (
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 pb-1 xs:pb-1.5 sm:pb-2">
              {/* Left Arrow */}
              <button
                onClick={prevSlide}
                title="Previous Slide"
                className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  background: 'rgba(11, 16, 32, 0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f1f5f9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <ChevronLeft size={14} className="xs:w-[16px] xs:h-[16px] sm:w-[20px] sm:h-[20px]" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={nextSlide}
                title="Next Slide"
                className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  background: 'rgba(11, 16, 32, 0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f1f5f9',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <ChevronRight size={14} className="xs:w-[16px] xs:h-[16px] sm:w-[20px] sm:h-[20px]" />
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
