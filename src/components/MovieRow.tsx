'use client';

import React, { useRef, useState, useEffect } from 'react';
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

  // ── Smooth Initial Peek / Teaser Scroll Animation on Page Load ──
  useEffect(() => {
    if (!scrollRef.current || items.length <= 2) return;

    let hasInteracted = false;
    let timeoutId: NodeJS.Timeout;
    let returnTimeoutId: NodeJS.Timeout;

    const cancelPeek = () => {
      hasInteracted = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (returnTimeoutId) clearTimeout(returnTimeoutId);
    };

    const el = scrollRef.current;
    el.addEventListener('touchstart', cancelPeek, { passive: true, once: true });
    el.addEventListener('mousedown', cancelPeek, { once: true });

    // Smooth peek animation
    timeoutId = setTimeout(() => {
      if (hasInteracted || !scrollRef.current) return;
      const peekAmount = Math.min(130, scrollRef.current.clientWidth * 0.3);
      scrollRef.current.scrollTo({ left: peekAmount, behavior: 'smooth' });

      returnTimeoutId = setTimeout(() => {
        if (hasInteracted || !scrollRef.current) return;
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }, 550);
    }, 750);

    return () => {
      cancelPeek();
      if (el) {
        el.removeEventListener('touchstart', cancelPeek);
        el.removeEventListener('mousedown', cancelPeek);
      }
    };
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const isTV = type === 'tv';

  return (
    <section className="relative w-full max-w-full overflow-hidden">
      {/* ── Section Header (Responsive with Accent Bar & Truncate on Small Screens) ── */}
      <div
        className={`flex items-center justify-between gap-2 sm:gap-4 mb-2.5 sm:mb-3.5 ${
          noPadding ? 'px-0' : 'px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Vertical Accent Pill */}
          <span
            className="w-1 sm:w-1.5 h-4 sm:h-5 rounded-full flex-shrink-0"
            style={{
              background: isTV
                ? 'linear-gradient(to bottom, #ec4899, #8b5cf6)'
                : 'linear-gradient(to bottom, #06b6d4, #3b82f6)',
              boxShadow: isTV
                ? '0 0 10px rgba(236,72,153,0.5)'
                : '0 0 10px rgba(6,182,212,0.5)',
            }}
          />
          <h2 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-white tracking-tight truncate leading-tight">
            {title}
          </h2>
        </div>

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-[11px] xs:text-xs sm:text-sm font-semibold transition-colors duration-200 hover:text-cyan-400 flex items-center gap-0.5 flex-shrink-0 text-slate-400 group/link"
          >
            <span className="group-hover/link:text-cyan-400 transition-colors">See All</span>
            <ChevronRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* ── Scroll container with isolated row group & Glass Navigation ── */}
      <div className="relative group/row w-full max-w-full">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={`absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
              isScrolling
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover/row:opacity-100 pointer-events-none group-hover/row:pointer-events-auto'
            }`}
            style={{
              background: 'rgba(11, 16, 32, 0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              color: '#f1f5f9',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={`absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
              isScrolling
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover/row:opacity-100 pointer-events-none group-hover/row:pointer-events-auto'
            }`}
            style={{
              background: 'rgba(11, 16, 32, 0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              color: '#f1f5f9',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-20 z-[5] pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #050816, transparent)',
            }}
          />
        )}

        {/* Right fade */}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-20 z-[5] pointer-events-none"
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
          className={`flex gap-2.5 sm:gap-4 md:gap-5 overflow-x-auto hide-scrollbar ${
            noPadding ? 'px-0' : 'px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'
          } pb-2.5 sm:pb-3`}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[160px] xs:w-[178px] sm:w-[195px] md:w-[215px] lg:w-[230px] xl:w-[245px]"
            >
              <MovieCard item={item} type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
