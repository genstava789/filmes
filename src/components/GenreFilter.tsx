'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Genre } from '@/types/tmdb';
import siteConfig from '@/config';

interface GenreFilterProps {
  genres: Genre[];
  activeGenreId?: number;
  title?: string;
}

export default function GenreFilter({ genres, activeGenreId, title }: GenreFilterProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability, { passive: true });
      window.addEventListener('resize', checkScrollability);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [genres]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.75, 400);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleGenreClick = (genreId: number) => {
    router.push(`/genre/${genreId}`);
  };

  return (
    <div className="relative group/genres">
      {/* Header with Title, horizontal line & Desktop Navigation Arrows */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            {title || siteConfig.homepageSections?.browseGenres || 'Browse by Genre'}
          </h2>
          <div className="h-[2px] w-8 sm:w-12 rounded-full bg-gradient-to-r from-cyan-400 to-transparent" />
        </div>

        {/* Scroll Arrows for Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            title="Scroll Left"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
              canScrollLeft
                ? 'bg-white/[0.08] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/40 cursor-pointer'
                : 'bg-white/[0.02] text-slate-600 border border-transparent cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            title="Scroll Right"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
              canScrollRight
                ? 'bg-white/[0.08] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/40 cursor-pointer'
                : 'bg-white/[0.02] text-slate-600 border border-transparent cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Genre Pills Scroll Container */}
      <div className="relative">
        {/* Left Fade Gradient */}
        {canScrollLeft && (
          <div
            className="hidden sm:block absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none transition-opacity duration-200"
            style={{
              background: 'linear-gradient(to right, #050816, transparent)',
            }}
          />
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar scroll-smooth py-1"
        >
          {/* "All" button */}
          <button
            onClick={() => router.push('/')}
            className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              !activeGenreId
                ? 'text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] scale-105'
                : 'text-slate-300 hover:text-cyan-400 hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30'
            }`}
            style={{
              background: !activeGenreId
                ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                : 'rgba(255, 255, 255, 0.05)',
            }}
          >
            All Genres
          </button>

          {/* Genre list */}
          {genres.map((genre) => {
            const isActive = activeGenreId === genre.id;
            return (
              <button
                key={genre.id}
                onClick={() => handleGenreClick(genre.id)}
                className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  isActive
                    ? 'text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] font-semibold'
                    : 'text-slate-300 hover:text-cyan-400 hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                    : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {genre.name}
              </button>
            );
          })}
        </div>

        {/* Right Fade Gradient */}
        {canScrollRight && (
          <div
            className="hidden sm:block absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none transition-opacity duration-200"
            style={{
              background: 'linear-gradient(to left, #050816, transparent)',
            }}
          />
        )}
      </div>
    </div>
  );
}
