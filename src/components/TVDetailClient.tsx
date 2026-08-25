'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Film,
  Tv,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import TrailerModal from '@/components/TrailerModal';
import VideoPlayer from '@/components/VideoPlayer';
import ShareButton from '@/components/ShareButton';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { CustomSeason, CustomEpisode } from '@/lib/markdownTV';

interface TVDetailHeaderActionsProps {
  activeEpisodeLabel?: string;
  activeEpisodeTitle?: string;
  hasVideo?: boolean;
  trailerKey?: string | null;
  homepage?: string | null;
  showTitle: string;
}

export function TVDetailHeaderActions({
  trailerKey,
  showTitle,
}: TVDetailHeaderActionsProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Watch Trailer */}
        {trailerKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
              boxShadow: '0 0 18px rgba(236,72,153,0.35)',
            }}
          >
            <Film size={16} />
            <span>Watch Trailer</span>
          </button>
        )}

        {/* Bookmark / Watchlist */}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: bookmarked ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.06)',
            border: bookmarked
              ? '1px solid rgba(236,72,153,0.5)'
              : '1px solid rgba(255,255,255,0.1)',
            color: bookmarked ? '#ec4899' : '#f1f5f9',
          }}
        >
          <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
          <span>{bookmarked ? 'Saved' : 'Watchlist'}</span>
        </button>

        {/* Share Button */}
        <ShareButton title={showTitle} />
      </div>

      {showTrailer && trailerKey && (
        <TrailerModal
          videoKey={trailerKey}
          title={`${showTitle} - Trailer`}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </>
  );
}

interface TVDetailPlayerSectionProps {
  showTitle: string;
  seasons: CustomSeason[];
  hasSeasons: boolean;
  initialActiveEpisode: CustomEpisode | null;
  defaultBackdrop?: string;
}

export default function TVDetailClient({
  showTitle,
  seasons,
  hasSeasons,
  initialActiveEpisode,
  defaultBackdrop,
}: TVDetailPlayerSectionProps) {
  const [activeEpisode, setActiveEpisode] = useState<CustomEpisode | null>(initialActiveEpisode);

  const initialSeasonIndex = seasons.findIndex((s) =>
    s.episodes.some((e) => e.slug === activeEpisode?.slug)
  );
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(
    initialSeasonIndex >= 0 ? initialSeasonIndex : 0
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected season when activeEpisode changes
  useEffect(() => {
    if (activeEpisode) {
      const idx = seasons.findIndex((s) =>
        s.episodes.some((e) => e.slug === activeEpisode.slug)
      );
      if (idx >= 0 && idx !== selectedSeasonIndex) {
        setSelectedSeasonIndex(idx);
      }
    }
  }, [activeEpisode, seasons, selectedSeasonIndex]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];

  const handleSelectEpisode = (ep: CustomEpisode) => {
    setActiveEpisode(ep);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', ep.urlPath);
    }
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const currentVideoTitle = activeEpisode
    ? `${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`
    : showTitle;

  return (
    <div className="w-full">
      {/* ── 1. Top Video Player (Edge-to-edge / Full view) ── */}
      {activeEpisode?.videoUrl && (
        <div className="w-full bg-black mb-4">
          <VideoPlayer
            key={activeEpisode.slug}
            videoUrl={activeEpisode.videoUrl}
            title={currentVideoTitle}
            poster={activeEpisode.imageUrl || defaultBackdrop}
          />
        </div>
      )}

      {/* ── 2. Open Episode Details & Actions (No Enclosing Card Container) ── */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-2">
        {/* Episode Title */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight mb-2 tracking-tight text-white">
          {activeEpisode ? `${activeEpisode.episodeLabel}: ${activeEpisode.title}` : showTitle}
        </h1>

        {/* Episode Metadata Badges Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#06b6d4',
            }}
          >
            HD
          </span>
          {activeEpisode?.rating && (
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              ★ {activeEpisode.rating}
            </span>
          )}
          {activeEpisode?.duration && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
              <Clock size={14} />
              {activeEpisode.duration}
            </div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {showTitle}
          </span>
        </div>

        {/* Episode Overview Snippet */}
        {activeEpisode?.overview && (
          <p className="text-xs sm:text-sm sm:leading-relaxed leading-normal mb-5 max-w-4xl text-slate-300">
            {activeEpisode.overview}
          </p>
        )}

        {/* Dedicated Action Buttons (Watchlist & Share) */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setBookmarked(!bookmarked)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: bookmarked ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.06)',
              border: bookmarked
                ? '1px solid rgba(236,72,153,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              color: bookmarked ? '#ec4899' : '#f1f5f9',
            }}
          >
            <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            <span>{bookmarked ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
          </button>

          <ShareButton title={`${showTitle} - ${activeEpisode?.episodeLabel || 'Episode'}`} />
        </div>

        {/* ── 3. Bilibili.tv-Style Pill Badges Episode Selector (Open & Clean) ── */}
        {seasons.length > 0 && (
          <div className="pt-5 border-t border-white/[0.08]">
            {/* Header: Title & Season Dropdown */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Tv size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Pilih Episode ({hasSeasons ? currentSeason.seasonName : 'Season 1'})
                </h3>
              </div>

              {/* Season Selector Dropdown */}
              {hasSeasons && seasons.length > 1 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(124, 58, 237, 0.22))',
                      border: '1px solid rgba(6, 182, 212, 0.45)',
                    }}
                  >
                    <Sparkles size={12} className="text-cyan-400" />
                    <span>{currentSeason.seasonName}</span>
                    <ChevronDown
                      size={13}
                      className={`text-slate-400 transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Modal */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 p-1.5 rounded-2xl border z-30 shadow-2xl animate-in fade-in slide-in-from-top-2"
                      style={{
                        background: 'rgba(9, 13, 30, 0.95)',
                        backdropFilter: 'blur(24px)',
                        borderColor: 'rgba(6, 182, 212, 0.3)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {seasons.map((season, idx) => {
                        const isSelected = selectedSeasonIndex === idx;
                        return (
                          <button
                            key={season.seasonName}
                            type="button"
                            onClick={() => {
                              setSelectedSeasonIndex(idx);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                              isSelected
                                ? 'text-cyan-300'
                                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                            }`}
                            style={{
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))'
                                : 'transparent',
                            }}
                          >
                            <span>{season.seasonName}</span>
                            {isSelected && <Check size={14} className="text-cyan-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bilibili.tv Pill Badges (E1, E2, E3...) Horizontal Scroll */}
            <div className="relative flex items-center">
              <button
                onClick={() => scrollHorizontally('left')}
                className="hidden sm:flex absolute left-0 z-10 w-7 h-10 items-center justify-center rounded-l-xl text-slate-300 hover:text-white transition-all"
                style={{
                  background: 'linear-gradient(90deg, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.6) 100%)',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <div
                ref={scrollContainerRef}
                className="w-full flex items-center gap-2 overflow-x-auto py-2 sm:px-8 hide-scrollbar scroll-smooth"
              >
                {currentSeason.episodes.map((ep) => {
                  const isActive = activeEpisode?.slug === ep.slug;
                  const badgeText = `E${ep.episodeNumber}`;

                  return (
                    <button
                      key={ep.slug}
                      type="button"
                      onClick={() => handleSelectEpisode(ep)}
                      className={`flex-shrink-0 flex items-center justify-center rounded-xl font-bold transition-all duration-200 min-w-[56px] h-10 px-3.5 ${
                        isActive
                          ? 'text-cyan-300 scale-105'
                          : 'text-slate-400 hover:text-white hover:border-cyan-400/40'
                      }`}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(124, 58, 237, 0.25))'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isActive
                          ? '1.5px solid rgba(6, 182, 212, 0.8)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: isActive
                          ? '0 0 18px rgba(6, 182, 212, 0.4)'
                          : 'none',
                      }}
                      title={`${ep.episodeLabel}: ${ep.title}`}
                    >
                      <span className="text-xs font-black">{badgeText}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => scrollHorizontally('right')}
                className="hidden sm:flex absolute right-0 z-10 w-7 h-10 items-center justify-center rounded-r-xl text-slate-300 hover:text-white transition-all"
                style={{
                  background: 'linear-gradient(-90deg, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.6) 100%)',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Active Episode Markdown Content / Notes ── */}
      {activeEpisode?.contentHtml && (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-8">
          <MarkdownRenderer
            contentHtml={activeEpisode.contentHtml}
            title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
          />
        </div>
      )}
    </div>
  );
}
