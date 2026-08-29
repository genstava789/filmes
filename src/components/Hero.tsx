'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Play, Star, ChevronLeft, ChevronRight, Film, Volume2, VolumeX, X } from 'lucide-react';
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
    if (customFeaturedItems !== undefined && customFeaturedItems.length > 0) {
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
        ? getImageUrl(m.backdrop_path, 'original')
        : m.poster_path
        ? getImageUrl(m.poster_path, 'original')
        : '/placeholder-poster.svg';
      const poster = m.poster_path
        ? getImageUrl(m.poster_path, 'w500')
        : m.backdrop_path
        ? getImageUrl(m.backdrop_path, 'original')
        : '/placeholder-poster.svg';

      const itemTitle = m.title || m.name || 'Featured';
      const itemYear = m.release_date
        ? new Date(m.release_date).getFullYear()
        : m.first_air_date
        ? new Date(m.first_air_date).getFullYear()
        : '2025';
      const itemLink = isTV ? getTVUrl(m) : getMovieUrl(m);

      const bestLogo = m.images?.logos?.find((l: any) => l.iso_639_1 === 'en' || l.iso_639_1 === 'id' || !l.iso_639_1) || m.images?.logos?.[0];
      const logoUrl = bestLogo?.file_path ? getImageUrl(bestLogo.file_path, 'original') : undefined;

      const trailer = m.videos?.results?.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || m.videos?.results?.find((v: any) => v.site === 'YouTube');
      const trailerKey = trailer?.key || undefined;

      return {
        id: m.id,
        tmdbId: m.id,
        title: itemTitle,
        overview: m.overview,
        backdropUrl: backdrop,
        posterUrl: poster,
        logoUrl,
        trailerKey,
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
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [logoErrors, setLogoErrors] = useState<Record<string | number, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch Swipe Gesture Tracking
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const total = items.length;
  const currentItem = items[currentIndex] || items[0];

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setIsPlayingTrailer(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setIsPlayingTrailer(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const selectSlide = (idx: number) => {
    setIsPlayingTrailer(false);
    setCurrentIndex(idx);
  };

  const toggleTrailer = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentItem?.trailerKey) return;
    setIsPlayingTrailer((prev) => !prev);
  };

  // Touch handlers for mobile swipe on background
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

  // Auto-slide effect (disabled when trailer is playing or user hovers)
  useEffect(() => {
    if (total <= 1 || isHovered || isPlayingTrailer) return;
    const intervalMs = (siteConfig.heroIntervalSeconds || 7) * 1000;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, isPlayingTrailer, nextSlide]);

  if (!currentItem) return null;

  const btnBg =
    buttonGradient ||
    (isTV
      ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
      : 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)');
  const btnShadow = isTV
    ? '0 0 20px rgba(236,72,153,0.35)'
    : '0 0 20px rgba(6,182,212,0.35)';

  const hasLogo = Boolean(currentItem.logoUrl) && !logoErrors[currentItem.id || currentIndex];
  const rawLogo = currentItem.logoUrl ? getImageUrl(currentItem.logoUrl, 'original') : undefined;

  return (
    <section
      className="relative w-full max-w-full aspect-[16/9] min-h-[300px] xs:min-h-[340px] sm:min-h-[440px] md:min-h-[500px] lg:min-h-[560px] overflow-hidden select-none touch-pan-y font-outfit"
      style={{ overscrollBehaviorX: 'none' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Background Slides: Full HD untouched original image directly from TMDB CDN (Zero blur rasterization) ── */}
      {items.map((item, idx) => {
        const isCurrent = idx === currentIndex;
        const rawBg = item.backdropUrl || item.posterUrl;
        const bgImage = getImageUrl(rawBg, 'original');
        return (
          <div
            key={item.id || idx}
            onClick={() => {
              if (isCurrent && item.trailerKey && !isPlayingTrailer) {
                setIsPlayingTrailer(true);
              }
            }}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${
              isCurrent ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
            }`}
          >
            {bgImage && (
              <img
                src={bgImage}
                alt={item.title || 'Featured item'}
                className="absolute inset-0 w-full h-full object-cover object-top sm:object-center"
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
          </div>
        );
      })}

      {/* ── Embedded In-Hero YouTube Video Trailer (Plays seamlessly across Hero without hiding UI) ── */}
      {isPlayingTrailer && currentItem.trailerKey && (
        <div className="absolute inset-0 z-[5] overflow-hidden bg-black animate-in fade-in duration-500">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentItem.trailerKey}?autoplay=1&mute=${
              isMuted ? 1 : 0
            }&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&loop=1&playlist=${
              currentItem.trailerKey
            }&playsinline=1&enablejsapi=1`}
            title={`${currentItem.title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="absolute -top-[15%] -bottom-[15%] -left-[10%] -right-[10%] w-[120%] h-[130%] object-cover pointer-events-none"
          />
        </div>
      )}

      {/* ── Pure Clean Gradient Overlays (Zero backdrop blur for maximum sharpness) ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(5,8,22,1) 0%, rgba(5,8,22,0.85) 18%, rgba(5,8,22,0.35) 45%, rgba(5,8,22,0.05) 75%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(5,8,22,0.92) 0%, rgba(5,8,22,0.65) 35%, rgba(5,8,22,0.15) 65%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,8,22,0.55) 0%, transparent 28%)',
        }}
      />

      {/* ── Trailer Controls Bar (Top Right: Close Trailer & Mute/Unmute) ── */}
      {isPlayingTrailer && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-cyan-400" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlayingTrailer(false)}
            className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            title="Tutup Trailer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Hero Content (IDLIX Layout: Stylized Title Logo Graphic, Minimal Metadata, Action Buttons) ── */}
      <div className="relative z-20 h-full flex flex-col justify-end px-3.5 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pb-3 xs:pb-3.5 sm:pb-5 md:pb-6 lg:pb-8">
        <div className="w-full flex items-end justify-between gap-3 sm:gap-6">

          {/* ── Left Column: Logo/Title -> Clean Metadata -> Overview -> Action Buttons -> Indicator Dots ── */}
          <div className="max-w-[75%] xs:max-w-[70%] sm:max-w-xl md:max-w-2xl flex flex-col items-start">
            
            {/* Heading Title: Stylized Official Title Logo Graphic (from poster artwork) or Text Fallback */}
            {hasLogo && rawLogo ? (
              <div className="mb-2 sm:mb-3 max-w-[220px] xs:max-w-[280px] sm:max-w-[380px] md:max-w-[450px]">
                <img
                  src={rawLogo}
                  alt={currentItem.title || 'Movie Logo'}
                  onError={() =>
                    setLogoErrors((prev) => ({
                      ...prev,
                      [currentItem.id || currentIndex]: true,
                    }))
                  }
                  className="max-h-12 xs:max-h-16 sm:max-h-22 md:max-h-28 lg:max-h-32 w-auto object-contain object-left drop-shadow-md"
                />
              </div>
            ) : (
              <h1
                className="hero-title text-sm xs:text-base sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-1.5 sm:mb-2.5"
                style={{
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                }}
              >
                {currentItem.title}
              </h1>
            )}

            {/* Clean IDLIX-Style Minimalist Metadata Row (No Cluttered Rainbow Badges) */}
            <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 sm:gap-2.5 mb-1.5 xs:mb-2 sm:mb-2.5 text-[10.5px] xs:text-xs sm:text-[13px] text-slate-300 font-medium">
              {/* Rating */}
              <div className="flex items-center gap-1 font-bold text-amber-400">
                <Star size={13} fill="currentColor" className="text-amber-400 flex-shrink-0" />
                <span>{(currentItem.rating ?? 8.5).toFixed(1)}</span>
              </div>

              {currentItem.year && (
                <>
                  <span className="text-slate-500 font-bold">•</span>
                  <span>{currentItem.year}</span>
                </>
              )}

              {currentItem.duration && (
                <>
                  <span className="text-slate-500 font-bold">•</span>
                  <span>{currentItem.duration}</span>
                </>
              )}

              <span className="text-slate-500 font-bold">•</span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] sm:text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                HD
              </span>

              {currentItem.genres && currentItem.genres.length > 0 && (
                <>
                  <span className="text-slate-500 font-bold hidden xs:inline">•</span>
                  <span className="hidden xs:inline text-slate-300">{currentItem.genres.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>

            {/* Overview / Deskripsi */}
            {currentItem.overview && (
              <p className="text-[9.5px] xs:text-[10.5px] sm:text-xs md:text-[13px] text-slate-300 line-clamp-1 xs:line-clamp-2 md:line-clamp-3 leading-relaxed max-w-lg mb-2 sm:mb-3 font-normal opacity-90">
                {currentItem.overview}
              </p>
            )}

            {/* Action Buttons: Tonton (Primary) & Trailer (Secondary In-Hero Preview) */}
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 xs:mb-2 sm:mb-2.5">
              <Link
                href={currentItem.link || '/'}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-1.5 xs:px-5 xs:py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[11px] xs:text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: btnBg,
                  color: 'white',
                  boxShadow: btnShadow,
                }}
              >
                <Play size={14} fill="currentColor" />
                <span>Tonton</span>
              </Link>

              {currentItem.trailerKey && (
                <button
                  type="button"
                  onClick={toggleTrailer}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 xs:px-3.5 xs:py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[11px] xs:text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95 border backdrop-blur-md shadow-md cursor-pointer ${
                    isPlayingTrailer
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                  }`}
                >
                  <Film size={13} className={isPlayingTrailer ? 'text-rose-400' : 'text-cyan-400'} />
                  <span>{isPlayingTrailer ? 'Tutup Trailer' : 'Trailer'}</span>
                </button>
              )}
            </div>

            {/* Minimalist & Sleek Glowing Indicator Dots on Left (Below Action Buttons) */}
            {total > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                {items.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSlide(idx);
                      }}
                      title={`Slide ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer focus:outline-none rounded-full ${
                        isCurrent
                          ? 'w-5 xs:w-6 h-1.5 opacity-100'
                          : 'w-1.5 sm:w-2 h-1.5 bg-white/25 hover:bg-white/50'
                      }`}
                      style={{
                        background: isCurrent
                          ? isTV
                            ? 'linear-gradient(90deg, #ec4899, #db2777)'
                            : 'linear-gradient(90deg, #06b6d4, #0284c7)'
                          : undefined,
                        boxShadow: isCurrent
                          ? isTV
                            ? '0 0 10px rgba(236,72,153,0.8)'
                            : '0 0 10px rgba(6,182,212,0.8)'
                          : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}

          </div>

          {/* ── Right Column: Ultra-Transparent Glass Swiper Navigation (Prev & Next) ── */}
          {total > 1 && (
            <div className="relative z-30 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 pb-0.5 xs:pb-1 sm:pb-1.5">
              {/* Left Arrow */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevSlide();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Previous Slide"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>

              {/* Right Arrow */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextSlide();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Next Slide"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
