'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Tv,
  LayoutGrid,
  List as ListIcon,
  Star,
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
  defaultBackdrop,
  onSelectEpisode,
}: EpisodeSelectorProps) {
  // Find initial selected season index based on activeEpisode
  const initialSeasonIndex = seasons.findIndex((s) =>
    s.episodes.some((e) => e.slug === activeEpisode?.slug)
  );
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(
    initialSeasonIndex >= 0 ? initialSeasonIndex : 0
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Auto-scroll the active badge into view horizontally in grid mode
  useEffect(() => {
    if (viewMode === 'grid' && activeBadgeRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const badge = activeBadgeRef.current;
      const containerRect = container.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();

      if (badgeRect.left < containerRect.left || badgeRect.right > containerRect.right) {
        const scrollLeft =
          badge.offsetLeft - container.offsetWidth / 2 + badge.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }
  }, [activeEpisode?.slug, selectedSeasonIndex, viewMode]);

  const handleEpisodeClick = (ep: CustomEpisode) => {
    if (onSelectEpisode) {
      onSelectEpisode(ep);
    }
    // Update browser URL bar cleanly without triggering full-page RSC re-fetch
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', ep.urlPath);
    }
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div
        className="rounded-2xl p-4 sm:p-6 border relative overflow-hidden transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(11, 16, 34, 0.95) 0%, rgba(7, 10, 24, 0.98) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.28)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
              }}
            >
              <Tv size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                  Daftar Episode
                </h2>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#38bdf8',
                  }}
                >
                  {hasSeasons ? currentSeason.seasonName : 'Season 1'}
                </span>
              </div>
              <p className="text-xs text-neo-text-muted mt-0.5">
                {currentSeason.episodes.length} Episode Tersedia • Pilih untuk memutar langsung
              </p>
            </div>
          </div>

          {/* Controls: View Mode Switcher & Season Selector Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid / Badge View"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={{
                  background:
                    viewMode === 'grid'
                      ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                      : 'transparent',
                }}
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={{
                  background:
                    viewMode === 'list'
                      ? 'linear-gradient(135deg, #06b6d4, #7c3aed)'
                      : 'transparent',
                }}
              >
                <ListIcon size={13} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

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
          </div>
        </div>

        {/* VIEW MODE 1: GRID / BADGE VIEW (Bilibili Horizontal Row) */}
        {viewMode === 'grid' && (
          <div className="mt-4">
            <div className="relative flex items-center">
              {/* Scroll Left Button */}
              <button
                onClick={() => scrollHorizontally('left')}
                className="hidden sm:flex absolute left-0 z-10 w-7 h-11 items-center justify-center rounded-l-lg text-slate-300 hover:text-white transition-all"
                style={{
                  background: 'linear-gradient(90deg, rgba(8, 12, 28, 0.95) 0%, rgba(8, 12, 28, 0.5) 100%)',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
                title="Scroll Left"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Horizontal Scroll Badges */}
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
                      className={`flex-shrink-0 flex items-center justify-center rounded-xl font-bold transition-all duration-200 ${
                        isActive
                          ? 'text-cyan-400'
                          : 'text-slate-400 hover:text-white hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      }`}
                      style={{
                        minWidth: '56px',
                        height: '42px',
                        padding: '0 14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: isActive
                          ? '1.5px solid #06b6d4'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: isActive
                          ? '0 0 16px rgba(6, 182, 212, 0.45)'
                          : 'none',
                      }}
                    >
                      <span className="text-xs sm:text-sm tracking-wider font-extrabold">
                        {badgeText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scroll Right Button */}
              <button
                onClick={() => scrollHorizontally('right')}
                className="hidden sm:flex absolute right-0 z-10 w-7 h-11 items-center justify-center rounded-r-lg text-slate-300 hover:text-white transition-all"
                style={{
                  background: 'linear-gradient(-90deg, rgba(8, 12, 28, 0.95) 0%, rgba(8, 12, 28, 0.5) 100%)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                }}
                title="Scroll Right"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Active Episode Preview Card */}
            {activeEpisode && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider flex-shrink-0"
                    style={{
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      color: '#06b6d4',
                    }}
                  >
                    {activeEpisode.episodeLabel || `E${activeEpisode.episodeNumber}`}
                  </span>
                  <h3 className="font-bold text-white truncate max-w-sm sm:max-w-md md:max-w-xl">
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
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      <Star size={11} fill="currentColor" /> {activeEpisode.rating}
                    </span>
                  )}
                  <span className="text-neo-cyan font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Now Playing
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 2: LIST VIEW (Netflix Style Detailed Row Cards) */}
        {viewMode === 'list' && (
          <div className="mt-4 space-y-3">
            {currentSeason.episodes.map((ep) => {
              const isActive = activeEpisode?.slug === ep.slug;
              const epImage = ep.imageUrl || defaultBackdrop || '/placeholder-poster.jpg';

              return (
                <div
                  key={ep.slug}
                  onClick={() => handleEpisodeClick(ep)}
                  className={`group relative rounded-xl p-3 sm:p-4 border transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isActive
                      ? 'scale-[1.01]'
                      : 'hover:scale-[1.008]'
                  }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isActive
                      ? 'rgba(6, 182, 212, 0.7)'
                      : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isActive
                      ? '0 0 25px rgba(6, 182, 212, 0.25), inset 0 0 15px rgba(6, 182, 212, 0.1)'
                      : 'none',
                  }}
                >
                  {/* Left: Thumbnail & Episode Index */}
                  <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                    {/* Index Number */}
                    <span
                      className="text-lg sm:text-xl font-black min-w-[28px] text-center"
                      style={{
                        color: isActive ? '#06b6d4' : '#475569',
                      }}
                    >
                      {String(ep.episodeNumber).padStart(2, '0')}
                    </span>

                    {/* Thumbnail Card */}
                    <div
                      className="relative rounded-lg overflow-hidden flex-shrink-0 w-28 sm:w-36 h-16 sm:h-20"
                      style={{
                        background: '#090e1f',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Image
                        src={epImage}
                        alt={ep.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 112px, 144px"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            background: isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.75)',
                            color: isActive ? 'white' : '#050816',
                          }}
                        >
                          <Play size={13} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>

                      {ep.duration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                          {ep.duration}
                        </span>
                      )}
                    </div>

                    {/* Title & Metadata (Mobile Layout) */}
                    <div className="min-w-0 flex-1 md:hidden">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: '#06b6d4',
                          }}
                        >
                          {ep.episodeLabel}
                        </span>
                        {ep.rating && (
                          <span className="text-yellow-400 text-[11px] font-bold">
                            ★ {ep.rating}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate mt-1">
                        {ep.title}
                      </h4>
                    </div>
                  </div>

                  {/* Middle: Title & Overview (Desktop Layout) */}
                  <div className="hidden md:block flex-1 min-w-0 px-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="text-xs font-black uppercase px-2 py-0.5 rounded"
                        style={{
                          background: isActive ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#06b6d4' : '#94a3b8',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {ep.episodeLabel}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white truncate">
                        {ep.title}
                      </h4>
                      {ep.rating && (
                        <span className="text-yellow-400 text-xs font-bold flex items-center gap-0.5">
                          <Star size={11} fill="currentColor" /> {ep.rating}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ep.overview || `${showTitle} ${ep.episodeLabel} full streaming episode.`}
                    </p>
                  </div>

                  {/* Right: Action Button */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {isActive ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Sedang Diputar
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEpisodeClick(ep);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 group-hover:scale-105"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                        }}
                      >
                        <Play size={12} fill="currentColor" />
                        Putar Episode
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
