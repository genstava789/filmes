'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, TVShow } from '@/types/tmdb';
import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  items: (Movie | TVShow)[];
  seeAllHref?: string;
  type?: 'movie' | 'tv';
  noPadding?: boolean;
}

export default function MovieRow({
  title,
  items,
  seeAllHref,
  type = 'movie',
  noPadding = false,
}: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const triggerScrollState = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2200);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    triggerScrollState();
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative w-full max-w-full overflow-hidden">
      {/* Header with section-title style (vertical gradient accent on the left) */}
      <div className={`flex items-center justify-between mb-4 ${noPadding ? 'px-0' : 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'}`}>
        <h2 className="section-title text-xl sm:text-2xl font-bold text-neo-text-primary">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs sm:text-sm font-medium transition-colors duration-200 hover:text-neo-cyan flex items-center gap-1 group/link"
            style={{ color: '#94a3b8' }}
          >
            <span className="group-hover/link:text-cyan-400 transition-colors">See All</span>
            <ChevronRight size={16} className="group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative group w-full max-w-full">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={`absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
              isScrolling
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
            }`}
            style={{
              background: 'rgba(11, 16, 32, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 0 20px rgba(6,182,212,0.25), 0 4px 15px rgba(0,0,0,0.6)',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={22} className="text-neo-cyan" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={`absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
              isScrolling
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
            }`}
            style={{
              background: 'rgba(11, 16, 32, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 0 20px rgba(6,182,212,0.25), 0 4px 15px rgba(0,0,0,0.6)',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight size={22} className="text-neo-cyan" />
          </button>
        )}

        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 md:w-20 z-[5] pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #050816, transparent)',
            }}
          />
        )}

        {/* Right fade */}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 md:w-20 z-[5] pointer-events-none"
            style={{
              background: 'linear-gradient(to left, #050816, transparent)',
            }}
          />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={triggerScrollState}
          onTouchMove={handleScroll}
          style={{ overscrollBehaviorX: 'contain' }}
          className={`flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto hide-scrollbar ${noPadding ? 'px-0' : 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'} pb-3`}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[160px] xs:w-[178px] sm:w-[195px] md:w-[215px] lg:w-[230px] xl:w-[245px]">
              <MovieCard item={item} type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
