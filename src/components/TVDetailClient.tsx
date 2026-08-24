'use client';

import React, { useState } from 'react';
import { Play, Bookmark, ExternalLink, Film } from 'lucide-react';
import TrailerModal from '@/components/TrailerModal';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeSelector from '@/components/EpisodeSelector';
import { CustomSeason, CustomEpisode } from '@/lib/markdownTV';

interface TVDetailClientProps {
  showTitle: string;
  trailerKey?: string | null;
  homepage?: string | null;
  seasons: CustomSeason[];
  hasSeasons: boolean;
  initialActiveEpisode: CustomEpisode | null;
  defaultBackdrop?: string;
  isCustomTV?: boolean;
}

export default function TVDetailClient({
  showTitle,
  trailerKey,
  homepage,
  seasons,
  hasSeasons,
  initialActiveEpisode,
  defaultBackdrop,
  isCustomTV = false,
}: TVDetailClientProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeEpisode, setActiveEpisode] = useState<CustomEpisode | null>(initialActiveEpisode);

  const scrollToPlayer = () => {
    const playerEl = document.getElementById('video-player-section');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSelectEpisode = (ep: CustomEpisode) => {
    setActiveEpisode(ep);
  };

  return (
    <>
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3">
        {activeEpisode?.videoUrl && (
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
            <span>Play {activeEpisode.episodeLabel}: {activeEpisode.title}</span>
          </button>
        )}

        {trailerKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: activeEpisode?.videoUrl
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #ec4899, #7c3aed)',
              color: 'white',
              border: activeEpisode?.videoUrl ? '1px solid rgba(255,255,255,0.15)' : 'none',
              boxShadow: activeEpisode?.videoUrl ? 'none' : '0 0 20px rgba(236,72,153,0.4)',
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

      {/* Video Player Section */}
      {activeEpisode?.videoUrl && (
        <div className="mt-14">
          <VideoPlayer
            videoUrl={activeEpisode.videoUrl}
            title={`${showTitle} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`}
            poster={activeEpisode.imageUrl || defaultBackdrop}
          />
        </div>
      )}

      {/* Episode Selector UI with Season Dropdown and Episode Badges */}
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

      {/* Trailer Modal */}
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
