'use client';

import React, { useState } from 'react';
import { Play, Bookmark, ExternalLink, Film } from 'lucide-react';
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
  activeEpisodeLabel,
  activeEpisodeTitle,
  hasVideo = true,
  trailerKey,
  homepage,
  showTitle,
}: TVDetailHeaderActionsProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const scrollToPlayer = () => {
    const playerEl = document.getElementById('video-player-section');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {hasVideo && (
          <button
            onClick={scrollToPlayer}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              color: 'white',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)',
            }}
          >
            <Play size={18} fill="white" />
            <span>
              {activeEpisodeLabel
                ? `Play ${activeEpisodeLabel}: ${activeEpisodeTitle || 'Watch Now'}`
                : 'Watch Episode Now'}
            </span>
          </button>
        )}

        {trailerKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: hasVideo
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #ec4899, #7c3aed)',
              color: 'white',
              border: hasVideo ? '1px solid rgba(255,255,255,0.15)' : 'none',
              boxShadow: hasVideo ? 'none' : '0 0 20px rgba(236,72,153,0.4)',
            }}
          >
            <Film size={18} />
            Watch Trailer
          </button>
        )}

        <button
          onClick={() => setBookmarked(!bookmarked)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
          style={{
            background: bookmarked ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
            border: bookmarked
              ? '1px solid rgba(6,182,212,0.5)'
              : '1px solid rgba(255,255,255,0.15)',
            color: bookmarked ? '#06b6d4' : '#f1f5f9',
          }}
        >
          <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? 'Saved' : 'Watchlist'}
        </button>

        {homepage && (
          <a
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
            }}
          >
            <ExternalLink size={18} />
            Official Site
          </a>
        )}
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
      {/* Video Player Section (Rendered if active episode has video URL) */}
      {activeEpisode?.videoUrl && (
        <div className="mt-14">
          <VideoPlayer
            key={activeEpisode.slug}
            videoUrl={activeEpisode.videoUrl}
            title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
            poster={activeEpisode.imageUrl || defaultBackdrop}
          />
        </div>
      )}

      {/* Bilibili.tv Horizontal Episode Selector */}
      {seasons.length > 0 && (
        <EpisodeSelector
          seasons={seasons}
          hasSeasons={hasSeasons}
          activeEpisode={activeEpisode}
          showTitle={showTitle}
          defaultBackdrop={defaultBackdrop}
          onSelectEpisode={handleSelectEpisode}
        />
      )}

      {/* Active Episode Markdown Content / Notes */}
      {activeEpisode?.contentHtml && (
        <MarkdownRenderer
          contentHtml={activeEpisode.contentHtml}
          title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
        />
      )}
    </div>
  );
}
