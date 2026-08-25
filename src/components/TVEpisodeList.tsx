'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  ChevronDown,
  Clock,
  Tv,
  Check,
  Sparkles,
} from 'lucide-react';
import { CustomSeason, CustomEpisode } from '@/lib/markdownTV';

interface TVEpisodeListProps {
  seasons: CustomSeason[];
  hasSeasons: boolean;
  showTitle: string;
  showSlug: string;
  defaultBackdrop?: string;
}

export default function TVEpisodeList({
  seasons,
  hasSeasons,
  showTitle,
  defaultBackdrop,
}: TVEpisodeListProps) {
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close season dropdown
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

  if (!seasons || seasons.length === 0) return null;

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];

  return (
    <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
      {/* ── Header: Title & Season Dropdown ── */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
            }}
          >
            <Tv size={18} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Episodes List</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400">
                {currentSeason.episodes.length} episodes
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {hasSeasons ? currentSeason.seasonName : 'Season 1'} • Pilih episode untuk menonton
            </p>
          </div>
        </div>

        {/* Season Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          {hasSeasons && seasons.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(124, 58, 237, 0.22))',
                  border: '1px solid rgba(6, 182, 212, 0.45)',
                  boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
                }}
              >
                <Sparkles size={13} className="text-cyan-400" />
                <span>{currentSeason.seasonName}</span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 sm:w-56 p-1.5 rounded-2xl border z-30 shadow-2xl animate-in fade-in slide-in-from-top-2"
                  style={{
                    background: 'rgba(9, 13, 30, 0.95)',
                    backdropFilter: 'blur(24px)',
                    borderColor: 'rgba(6, 182, 212, 0.3)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(6, 182, 212, 0.15)',
                  }}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/[0.08] mb-1">
                    Select Season
                  </div>
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
                        <div className="flex items-center gap-2">
                          <span>{season.seasonName}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            ({season.episodes.length})
                          </span>
                        </div>
                        {isSelected && <Check size={14} className="text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300"
              style={{
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              {currentSeason.seasonName}
            </div>
          )}
        </div>
      </div>

      {/* ── Episodes List (Clean list item with thumbnail, title, overview, & Play button) ── */}
      <div className="space-y-3">
        {currentSeason.episodes.map((ep) => {
          const epImage = ep.imageUrl || defaultBackdrop || '/placeholder-poster.jpg';

          return (
            <Link
              key={ep.slug}
              href={ep.urlPath}
              className="group relative rounded-2xl p-3 sm:p-4 border transition-all duration-200 hover:scale-[1.01] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 block"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.07)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Left: Thumbnail & Episode Index */}
              <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                <span className="text-base sm:text-lg font-black min-w-[28px] text-center text-slate-500 group-hover:text-cyan-400 transition-colors">
                  {String(ep.episodeNumber).padStart(2, '0')}
                </span>

                {/* 16:9 Thumbnail */}
                <div
                  className="relative rounded-xl overflow-hidden flex-shrink-0 w-28 sm:w-36 h-16 sm:h-20 bg-slate-900"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
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
                        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                        color: 'white',
                      }}
                    >
                      <Play size={12} fill="white" className="ml-0.5" />
                    </div>
                  </div>

                  {ep.duration && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                      {ep.duration}
                    </span>
                  )}
                </div>

                {/* Mobile Details */}
                <div className="min-w-0 flex-1 md:hidden">
                  <span
                    className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#06b6d4',
                    }}
                  >
                    {ep.episodeLabel}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate mt-1">
                    {ep.title}
                  </h3>
                </div>
              </div>

              {/* Middle: Title & Overview (Desktop) */}
              <div className="hidden md:block flex-1 min-w-0 px-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-black uppercase px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#06b6d4',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    {ep.episodeLabel}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {ep.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {ep.overview || `${showTitle} ${ep.episodeLabel} full streaming episode.`}
                </p>
              </div>

              {/* Right: Watch Episode Button */}
              <div className="flex items-center justify-end w-full md:w-auto">
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200 group-hover:scale-105 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <Play size={12} fill="white" />
                  <span>Nonton</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
