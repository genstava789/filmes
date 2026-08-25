'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, Star, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Movie, Genre } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';
import siteConfig, { FeaturedItem } from '@/config';

interface HeroProps {
  movie?: Movie;
  movies?: Movie[];
  genres?: Genre[];
  customFeaturedItems?: FeaturedItem[];
}

export default function Hero({ movie, movies = [], genres = [], customFeaturedItems }: HeroProps) {
  // Build items list: prioritize customFeaturedItems -> siteConfig.featuredItems -> mapped TMDB movies
  const items: FeaturedItem[] = React.useMemo(() => {
    if (customFeaturedItems && customFeaturedItems.length > 0) {
      return customFeaturedItems;
    }
    if (siteConfig.featuredItems && siteConfig.featuredItems.length > 0) {
      return siteConfig.featuredItems;
    }

    // Fallback using incoming movies
    const sourceMovies = movies.length > 0 ? movies.slice(0, 3) : movie ? [movie] : [];
    return sourceMovies.map((m) => {
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

      return {
        id: m.id,
        tmdbId: m.id,
        title: m.title,
        overview: m.overview,
        backdropUrl: backdrop,
        posterUrl: poster,
        rating: Math.round(m.vote_average * 10) / 10,
        year: m.release_date ? new Date(m.release_date).getFullYear() : '2025',
        type: 'movie' as const,
        genres: itemGenres.slice(0, 3),
        link: `/movie/${m.id}`,
        badge: 'Featured',
      };
    });
  }, [customFeaturedItems, movies, movie, genres]);

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

  return (
    <section
      className="relative w-full overflow-hidden select-none touch-pan-y"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        /* Horizontal landscape scale on mobile (min 260px, aspect 16:9 feel), expansive wide banner on desktop */
        height: 'clamp(260px, 48vw, 750px)',
      }}
    >
      {/* ── Background Slides with Ken-Burns & Crossfade ── */}
      {items.map((item, idx) => {
        const isCurrent = idx === currentIndex;
        const bgImage = item.backdropUrl || item.posterUrl || '/placeholder-poster.svg';
        return (
          <div
            key={item.id || idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isCurrent ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
            }`}
          >
            {bgImage && (
              <div
                className={`relative w-full h-full transform transition-transform duration-7000 ease-out ${
                  isCurrent ? 'scale-105' : 'scale-100'
                }`}
              >
                <Image
                  src={bgImage}
                  alt={item.title || 'Featured item'}
                  fill
                  priority={idx === 0}
                  className="object-cover object-center"
                  sizes="100vw"
                />
              </div>
            )}
          </div>
        );
      })}

      {/* ── Gradient Overlays (Cinematic Vignette) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(5,8,22,0.95) 0%, rgba(5,8,22,0.75) 35%, rgba(5,8,22,0.3) 65%, rgba(5,8,22,0.15) 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(5,8,22,1) 0%, rgba(5,8,22,0.7) 25%, transparent 65%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,8,22,0.5) 0%, transparent 25%)',
        }}
      />

      {/* ── Hero Content (Responsive Horizontal Fit on Mobile, Expansive on Desktop) ── */}
      <div className="relative z-20 h-full flex items-end sm:items-center pb-5 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl lg:max-w-2xl">

            {/* Badge - Always "Featured" */}
            <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(124,58,237,0.25))',
                  border: '1px solid rgba(6,182,212,0.45)',
                  color: '#06b6d4',
                  boxShadow: '0 0 12px rgba(6,182,212,0.25)',
                }}
              >
                <Sparkles size={11} />
                Featured
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black leading-tight sm:leading-tight mb-1.5 sm:mb-3 text-white tracking-tight"
              style={{
                textShadow: '0 2px 20px rgba(0,0,0,0.7)',
              }}
            >
              {currentItem.title}
            </h1>

            {/* Tagline (Desktop) */}
            {currentItem.tagline && (
              <p className="hidden sm:block text-sm sm:text-base italic text-purple-300 mb-2 font-medium">
                &ldquo;{currentItem.tagline}&rdquo;
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4 text-xs sm:text-sm">
              {/* Rating */}
              <div
                className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  color: '#22c55e',
                }}
              >
                <Star size={12} fill="currentColor" />
                {(currentItem.rating ?? 8.5).toFixed(1)}
              </div>

              {/* HD Badge */}
              <span
                className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-black tracking-wider"
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#06b6d4',
                }}
              >
                HD
              </span>

              {/* Year */}
              {currentItem.year && (
                <div className="flex items-center gap-1 text-slate-300 text-xs sm:text-sm font-medium">
                  <Calendar size={12} />
                  {currentItem.year}
                </div>
              )}

              {/* Duration / Episodes */}
              {currentItem.duration && (
                <span className="hidden sm:inline-block text-slate-400 text-xs">
                  • {currentItem.duration}
                </span>
              )}

              {/* Genres */}
              {currentItem.genres && currentItem.genres.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {currentItem.genres.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.35)',
                        color: '#a78bfa',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Overview / Deskripsi (Compact on mobile, full on desktop) */}
            {currentItem.overview && (
              <p className="hidden sm:block text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 mb-4 sm:mb-6 line-clamp-2 md:line-clamp-3 max-w-xl">
                {currentItem.overview}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href={currentItem.link || '/'}
                className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  color: 'white',
                  boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                }}
              >
                <Play size={15} fill="white" className="sm:w-[18px] sm:h-[18px]" />
                <span>Watch Now</span>
              </Link>

              <Link
                href={currentItem.link || '/'}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f1f5f9',
                }}
              >
                <Info size={15} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden xs:inline">Details</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ── Slide Arrows & Full Circle Indicator Dots ── */}
      {total > 1 && (
        <>
          {/* Left Arrow */}
          <button
            onClick={prevSlide}
            title="Previous Slide"
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            style={{
              background: 'rgba(11, 16, 32, 0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={nextSlide}
            title="Next Slide"
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
            style={{
              background: 'rgba(11, 16, 32, 0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
            }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Full Circle Indicator Dots (Circle instead of width) */}
          <div className="absolute right-4 sm:right-8 bottom-3 sm:bottom-6 z-30 flex items-center gap-2">
            {items.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  title={`Go to slide ${idx + 1}`}
                  className={`rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
                    isCurrent
                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 scale-110 ring-2 ring-cyan-400/50 shadow-[0_0_10px_#06b6d4]'
                      : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/35 hover:bg-white/70 hover:scale-125'
                  }`}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
