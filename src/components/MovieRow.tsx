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

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative">
      {/* Header with previous section-title style */}
      <div className={`flex items-center justify-between mb-4 ${noPadding ? 'px-0' : 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'}`}>
        <h2 className="section-title text-xl sm:text-2xl font-bold text-neo-text-primary">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs sm:text-sm font-medium transition-colors duration-200 hover:text-neo-cyan flex items-center gap-1"
            style={{ color: '#94a3b8' }}
          >
            <span>See All</span>
            <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{
              background: 'rgba(5,8,22,0.9)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 0 15px rgba(6,182,212,0.2)',
              marginLeft: '4px',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} className="text-neo-cyan" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{
              background: 'rgba(5,8,22,0.9)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 0 15px rgba(6,182,212,0.2)',
              marginRight: '4px',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} className="text-neo-cyan" />
          </button>
        )}

        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-16 z-[5] pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #050816, transparent)',
            }}
          />
        )}

        {/* Right fade */}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-[5] pointer-events-none"
            style={{
              background: 'linear-gradient(to left, #050816, transparent)',
            }}
          />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar ${noPadding ? 'px-0' : 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'} pb-2`}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[155px] xs:w-[170px] sm:w-[185px] md:w-[200px] lg:w-[210px]">
              <MovieCard item={item} type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
