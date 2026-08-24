'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  ChevronDown,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  const router = useRouter();

  // Find initial selected season index based on activeEpisode
  const initialSeasonIndex = seasons.findIndex((s) =>
    s.episodes.some((e) => e.slug === activeEpisode?.slug)
  );
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(
    initialSeasonIndex >= 0 ? initialSeasonIndex : 0
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!seasons || seasons.length === 0) return null;

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];
  const allEpisodes = seasons.flatMap((s) => s.episodes);
  const currentEpIndex = allEpisodes.findIndex((e) => e.slug === activeEpisode?.slug);
  const prevEpisode = currentEpIndex > 0 ? allEpisodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < allEpisodes.length - 1 ? allEpisodes[currentEpIndex + 1] : null;

  const handleEpisodeClick = (ep: CustomEpisode) => {
    if (onSelectEpisode) {
      onSelectEpisode(ep);
    }
    // Update URL smoothly
    router.push(ep.urlPath, { scroll: false });

    // Smooth scroll to video player
    const playerEl = document.getElementById('video-player-section');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section className="mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        className="rounded-2xl p-5 sm:p-7 border"
        style={{
          background: 'linear-gradient(180deg, rgba(12, 18, 36, 0.85) 0%, rgba(8, 12, 28, 0.95) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#06b6d4',
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Daftar Episode
              </h2>
              <p className="text-xs text-neo-text-muted">
                {hasSeasons
                  ? `${seasons.length} Season • ${allEpisodes.length} Total Episode`
                  : `${allEpisodes.length} Episode Tersedia`}
              </p>
            </div>
          </div>

          {/* Quick Next / Prev buttons and Season Dropdown */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Prev / Next controls */}
            <div className="flex items-center gap-1.5">
              {prevEpisode && (
                <button
                  onClick={() => handleEpisodeClick(prevEpisode)}
                  title={`Sebelumnya: ${prevEpisode.title}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                  }}
                >
                  <ChevronLeft size={14} />
                  <span className="hidden md:inline">Prev</span>
                </button>
              )}
              {nextEpisode && (
                <button
                  onClick={() => handleEpisodeClick(nextEpisode)}
                  title={`Berikutnya: ${nextEpisode.title}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#06b6d4',
                  }}
                >
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* Season Dropdown Menu (Only shown if seasons exist) */}
            {hasSeasons && seasons.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#38bdf8',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
                  }}
                >
                  <span>{currentSeason.seasonName}</span>
                  <span className="text-xs text-neo-text-muted">({currentSeason.episodes.length} Ep)</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden shadow-2xl z-30 py-1.5 border"
                    style={{
                      background: 'rgba(12, 18, 36, 0.98)',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(6, 182, 212, 0.2)',
                    }}
                  >
                    {seasons.map((season, idx) => (
                      <button
                        key={season.seasonName}
                        onClick={() => {
                          setSelectedSeasonIndex(idx);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
                          selectedSeasonIndex === idx
                            ? 'text-neo-cyan bg-white/10 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: selectedSeasonIndex === idx ? '#06b6d4' : '#475569',
                            }}
                          />
                          <span>{season.seasonName}</span>
                        </div>
                        <span className="text-xs text-neo-text-muted">
                          {season.episodes.length} Ep
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : hasSeasons ? (
              <div
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  color: '#a78bfa',
                }}
              >
                {currentSeason.seasonName}
              </div>
            ) : null}
          </div>
        </div>

        {/* Episode Grid Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-5">
          {currentSeason.episodes.map((ep) => {
            const isActive = activeEpisode?.slug === ep.slug;
            const thumbnail = ep.imageUrl || defaultBackdrop || '/placeholder-poster.jpg';

            return (
              <button
                key={ep.slug}
                onClick={() => handleEpisodeClick(ep)}
                className={`group relative text-left rounded-xl p-3 flex gap-3 transition-all duration-300 ${
                  isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isActive
                    ? '1.5px solid rgba(6, 182, 212, 0.7)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: isActive
                    ? '0 0 25px rgba(6, 182, 212, 0.3), 0 8px 20px rgba(0, 0, 0, 0.6)'
                    : '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Thumbnail Box */}
                <div
                  className="relative rounded-lg overflow-hidden flex-shrink-0 bg-slate-900"
                  style={{ width: '90px', height: '60px' }}
                >
                  <Image
                    src={thumbnail}
                    alt={ep.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="90px"
                  />
                  {/* Play Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                      isActive ? 'bg-cyan-950/60 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.85)',
                        color: isActive ? '#ffffff' : '#050816',
                      }}
                    >
                      <Play size={10} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>

                  {/* Episode Badge on Image */}
                  <div
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: isActive ? '#06b6d4' : 'rgba(5, 8, 22, 0.85)',
                      color: isActive ? '#050816' : '#ffffff',
                    }}
                  >
                    {ep.episodeLabel}
                  </div>
                </div>

                {/* Episode Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-semibold line-clamp-1 leading-snug ${
                        isActive ? 'text-white font-bold' : 'text-slate-200 group-hover:text-neo-cyan'
                      }`}
                    >
                      {ep.title}
                    </h4>
                    {ep.overview && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {ep.overview}
                      </p>
                    )}
                  </div>

                  {/* Meta tag */}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    {ep.duration && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-neo-cyan" /> {ep.duration}
                      </span>
                    )}
                    {ep.rating && (
                      <span className="text-yellow-400 font-semibold">
                        ★ {ep.rating}
                      </span>
                    )}
                    {isActive && (
                      <span className="ml-auto text-[10px] font-bold text-neo-cyan flex items-center gap-1">
                        <CheckCircle2 size={11} /> Playing
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
