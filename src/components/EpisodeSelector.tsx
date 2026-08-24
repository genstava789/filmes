'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { CustomSeason, CustomEpisode } from '@/lib/markdownTV';

interface EpisodeSelectorProps {
  seasons: CustomSeason[];
  hasSeasons: boolean;
  activeEpisode: CustomEpisode | null;
  showTitle: string;
  defaultBackdrop?: string;
  onSelectEpisode?: (ep: CustomEpisode) => void;
}

export default function EpisodeSelector({
  seasons,
  hasSeasons,
  activeEpisode,
  showTitle,
  onSelectEpisode,
}: EpisodeSelectorProps) {
  // Find initial selected season index based on activeEpisode
  const initialSeasonIndex = seasons.findIndex((s) =>
    s.episodes.some((e) => e.slug === activeEpisode?.slug)
  );
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(
    initialSeasonIndex >= 0 ? initialSeasonIndex : 0
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeBadgeRef = useRef<HTMLButtonElement>(null);

  if (!seasons || seasons.length === 0) return null;

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];
  const allEpisodes = seasons.flatMap((s) => s.episodes);
  const currentEpIndex = allEpisodes.findIndex((e) => e.slug === activeEpisode?.slug);
  const prevEpisode = currentEpIndex > 0 ? allEpisodes[currentEpIndex - 1] : null;
  const nextEpisode =
    currentEpIndex >= 0 && currentEpIndex < allEpisodes.length - 1
      ? allEpisodes[currentEpIndex + 1]
      : null;

  // Auto-scroll the active badge into view horizontally
  useEffect(() => {
    if (activeBadgeRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const badge = activeBadgeRef.current;
      const containerRect = container.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();

      // If badge is out of view horizontally, scroll to center it
      if (badgeRect.left < containerRect.left || badgeRect.right > containerRect.right) {
        const scrollLeft =
          badge.offsetLeft - container.offsetWidth / 2 + badge.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }
  }, [activeEpisode?.slug, selectedSeasonIndex]);

  const handleEpisodeClick = (ep: CustomEpisode) => {
    if (onSelectEpisode) {
      onSelectEpisode(ep);
    }
    // Update browser URL bar cleanly without triggering heavy Next.js RSC re-fetch
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', ep.urlPath);
    }
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div
        className="rounded-2xl p-4 sm:p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(12, 18, 36, 0.9) 0%, rgba(8, 12, 28, 0.98) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.25)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 30px rgba(6, 182, 212, 0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
              }}
            >
              <Tv size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Daftar Episode
                </h2>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    color: '#38bdf8',
                  }}
                >
                  Bilibili Style
                </span>
              </div>
              <p className="text-xs text-neo-text-muted mt-0.5">
                {hasSeasons
                  ? `${currentSeason.seasonName} • ${currentSeason.episodes.length} Episode`
                  : `${allEpisodes.length} Episode Tersedia`}
              </p>
            </div>
          </div>

          {/* Controls: Season Switcher & Quick Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Season Selector Tabs (if multi-season) */}
            {hasSeasons && seasons.length > 1 && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {seasons.map((season, idx) => {
                  const isSelected = selectedSeasonIndex === idx;
                  return (
                    <button
                      key={season.seasonName}
                      onClick={() => setSelectedSeasonIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                          : 'transparent',
                      }}
                    >
                      {season.seasonName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Prev / Next Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => prevEpisode && handleEpisodeClick(prevEpisode)}
                disabled={!prevEpisode}
                title={prevEpisode ? `Sebelumnya: ${prevEpisode.title}` : 'Episode Pertama'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  prevEpisode
                    ? 'hover:scale-105 hover:border-cyan-500/50 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: prevEpisode ? '#f1f5f9' : '#64748b',
                }}
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <button
                onClick={() => nextEpisode && handleEpisodeClick(nextEpisode)}
                disabled={!nextEpisode}
                title={nextEpisode ? `Berikutnya: ${nextEpisode.title}` : 'Episode Terakhir'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  nextEpisode
                    ? 'hover:scale-105 hover:border-cyan-500/50 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{
                  background: nextEpisode
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(124, 58, 237, 0.25))'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: nextEpisode
                    ? '1px solid rgba(6, 182, 212, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: nextEpisode ? '#06b6d4' : '#64748b',
                }}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bilibili Horizontal Episode Badges Row */}
        <div className="relative mt-4 flex items-center">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollHorizontally('left')}
            className="hidden sm:flex absolute left-0 z-10 w-7 h-10 items-center justify-center rounded-l-lg text-slate-300 hover:text-white transition-all"
            style={{
              background: 'linear-gradient(90deg, rgba(8, 12, 28, 0.95) 0%, rgba(8, 12, 28, 0.6) 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
            title="Scroll Left"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Horizontal Scroll Area */}
          <div
            ref={scrollContainerRef}
            className="w-full flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-2 px-1 sm:px-8 hide-scrollbar scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {currentSeason.episodes.map((ep) => {
              const isActive = activeEpisode?.slug === ep.slug;
              const badgeText = `E${ep.episodeNumber}`;

              return (
                <button
                  key={ep.slug}
                  ref={isActive ? activeBadgeRef : null}
                  onClick={() => handleEpisodeClick(ep)}
                  title={`${badgeText}: ${ep.title}`}
                  className={`group relative flex-shrink-0 flex items-center justify-center rounded-xl font-bold transition-all duration-200 ${
                    isActive
                      ? 'scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    minWidth: '56px',
                    height: '42px',
                    padding: '0 12px',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.28) 0%, rgba(124, 58, 237, 0.28) 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isActive
                      ? '1.5px solid rgba(6, 182, 212, 0.85)'
                      : '1px solid rgba(255, 255, 255, 0.09)',
                    boxShadow: isActive
                      ? '0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2)'
                      : 'none',
                    color: isActive ? '#38bdf8' : '#cbd5e1',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    ) : null}
                    <span className="text-xs sm:text-sm tracking-wide font-extrabold">
                      {badgeText}
                    </span>
                  </div>

                  {/* Tiny active playing wave / dot indicator */}
                  {isActive && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                      style={{
                        background: '#06b6d4',
                        boxShadow: '0 0 8px #06b6d4',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollHorizontally('right')}
            className="hidden sm:flex absolute right-0 z-10 w-7 h-10 items-center justify-center rounded-r-lg text-slate-300 hover:text-white transition-all"
            style={{
              background: 'linear-gradient(-90deg, rgba(8, 12, 28, 0.95) 0%, rgba(8, 12, 28, 0.6) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
            }}
            title="Scroll Right"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Active Episode Preview Card */}
        {activeEpisode && (
          <div
            className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0"
                style={{
                  background: 'rgba(6, 182, 212, 0.2)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#06b6d4',
                }}
              >
                {activeEpisode.episodeLabel || `E${activeEpisode.episodeNumber}`}
              </span>
              <h3 className="font-semibold text-white truncate max-w-sm sm:max-w-md md:max-w-xl">
                {activeEpisode.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 text-neo-text-muted flex-shrink-0">
              {activeEpisode.duration && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-neo-cyan" />
                  {activeEpisode.duration}
                </span>
              )}
              {activeEpisode.rating && (
                <span className="text-yellow-400 font-semibold">
                  ★ {activeEpisode.rating}
                </span>
              )}
              <span className="text-neo-cyan font-medium flex items-center gap-1">
                <CheckCircle2 size={12} />
                Now Playing
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
