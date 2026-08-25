'use client';

import React, { useState } from 'react';
import { Bookmark, Film } from 'lucide-react';
import TrailerModal from '@/components/TrailerModal';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeSelector from '@/components/EpisodeSelector';
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
          <span>{bookmarked ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
        </button>
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

  const handleSelectEpisode = (ep: CustomEpisode) => {
    setActiveEpisode(ep);
  };

  return (
    <div className="w-full">
      {/* Top Video Player (Edge-to-edge / Full view) */}
      {activeEpisode?.videoUrl && (
        <div className="w-full bg-black mb-6">
          <VideoPlayer
            key={activeEpisode.slug}
            videoUrl={activeEpisode.videoUrl}
            title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
            poster={activeEpisode.imageUrl || defaultBackdrop}
          />
        </div>
      )}

      {/* Episode Selector */}
      {seasons.length > 0 && (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <EpisodeSelector
            seasons={seasons}
            hasSeasons={hasSeasons}
            activeEpisode={activeEpisode}
            showTitle={showTitle}
            defaultBackdrop={defaultBackdrop}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>
      )}

      {/* Active Episode Markdown Content / Notes */}
      {activeEpisode?.contentHtml && (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-6">
          <MarkdownRenderer
            contentHtml={activeEpisode.contentHtml}
            title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
          />
        </div>
      )}
    </div>
  );
}
