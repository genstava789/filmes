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

  // ── Cinematic Ultra-Slow-Motion Peek Teaser Animation on Section View ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length <= 2) return;

    let hasInteracted = false;
    let animFrameId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasAnimated = false;

    const cancelAnimation = () => {
      hasInteracted = true;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    el.addEventListener('touchstart', cancelAnimation, { passive: true, once: true });
    el.addEventListener('mousedown', cancelAnimation, { once: true });
    el.addEventListener('wheel', cancelAnimation, { passive: true, once: true });

    // Silky quadratic ease in-out curve for slow-motion feel
    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const animateScroll = (
      start: number,
      target: number,
      duration: number,
      onComplete?: () => void
    ) => {
      const startTime = performance.now();

      const step = (currentTime: number) => {
        if (hasInteracted || !el) return;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutQuad(progress);

        el.scrollLeft = start + (target - start) * easedProgress;

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else if (onComplete) {
          onComplete();
        }
      };

      animFrameId = requestAnimationFrame(step);
    };

    const startSlowMotionPeek = () => {
      if (hasAnimated || hasInteracted || !el) return;
      hasAnimated = true;

      const peekDistance = Math.min(140, Math.max(90, el.clientWidth * 0.3));
      const duration = 1600; // 1.6s ultra-smooth slow-motion glide

      // Phase 1: Glide right slowly
      animateScroll(0, peekDistance, duration, () => {
        // Phase 2: Gentle pause at peak
        timeoutId = setTimeout(() => {
          if (hasInteracted || !el) return;
          // Phase 3: Glide back to origin slowly
          animateScroll(peekDistance, 0, duration);
        }, 450);
      });
    };

    // Trigger slow-motion peek when each section enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            timeoutId = setTimeout(() => {
              startSlowMotionPeek();
            }, 350);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);

    return () => {
      cancelAnimation();
      observer.disconnect();
      if (el) {
        el.removeEventListener('touchstart', cancelAnimation);
        el.removeEventListener('mousedown', cancelAnimation);
        el.removeEventListener('wheel', cancelAnimation);
      }
    };
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const isTV = type === 'tv';

  return (
    <section className="relative w-full max-w-full overflow-hidden">
      {/* ── Section Header (Enlarged Title on Small Screens with Gradient Accent Bar) ── */}
      <div
        className={`flex items-center justify-between gap-2 sm:gap-4 mb-2.5 sm:mb-4 ${
          noPadding ? 'px-0' : 'px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Vertical Accent Bar */}
          <span
            className="w-1.5 sm:w-2 h-5 sm:h-6 rounded-full flex-shrink-0"
            style={{
              background: isTV
                ? 'linear-gradient(to bottom, #ec4899, #8b5cf6)'
                : 'linear-gradient(to bottom, #06b6d4, #3b82f6)',
              boxShadow: isTV
                ? '0 0 12px rgba(236,72,153,0.6)'
                : '0 0 12px rgba(6,182,212,0.6)',
            }}
          />
          <h2 className="font-poppins text-base xs:text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight truncate leading-tight">
            {title}
          </h2>
        </div>

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="font-poppins text-xs xs:text-[13px] sm:text-sm font-semibold transition-colors duration-200 hover:text-cyan-400 flex items-center gap-0.5 flex-shrink-0 text-slate-400 group/link"
          >
            <span className="group-hover/link:text-cyan-400 transition-colors">See All</span>
            <ChevronRight size={15} className="group-hover/link:translate-x-0.5 transition-transform" />
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
          className={`flex gap-2.5 sm:gap-3.5 md:gap-4.5 overflow-x-auto hide-scrollbar ${
            noPadding ? 'px-0' : 'px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14'
          } pb-2.5 sm:pb-3`}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[148px] xs:w-[162px] sm:w-[180px] md:w-[198px] lg:w-[218px] xl:w-[235px]"
            >
              <MovieCard item={item} type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
