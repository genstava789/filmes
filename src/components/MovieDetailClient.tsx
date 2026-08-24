'use client';

import React, { useState } from 'react';
import { Play, Bookmark, ExternalLink, Film } from 'lucide-react';
import TrailerModal from '@/components/TrailerModal';

interface MovieDetailClientProps {
  movieTitle: string;
  trailerKey?: string | null;
  homepage?: string | null;
  hasCustomVideo?: boolean;
}

export default function MovieDetailClient({
  movieTitle,
  trailerKey,
  homepage,
  hasCustomVideo = false,
}: MovieDetailClientProps) {
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
        {/* Custom Video Play Button or Trailer Button */}
        {hasCustomVideo ? (
          <button
            onClick={scrollToPlayer}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              color: 'white',
              boxShadow: '0 0 25px rgba(6,182,212,0.5)',
            }}
          >
            <Play size={18} fill="white" />
            Watch Video Now
          </button>
        ) : null}

        {/* Watch Trailer Button */}
        {trailerKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 ${
              hasCustomVideo ? '' : ''
            }`}
            style={{
              background: hasCustomVideo
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              color: 'white',
              border: hasCustomVideo ? '1px solid rgba(255,255,255,0.15)' : 'none',
              boxShadow: hasCustomVideo ? 'none' : '0 0 20px rgba(6,182,212,0.4)',
            }}
          >
            <Film size={18} />
            Watch Trailer
          </button>
        )}

        {/* Bookmark Button */}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
          style={{
            background: bookmarked ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            border: bookmarked
              ? '1px solid rgba(6,182,212,0.5)'
              : '1px solid rgba(255,255,255,0.15)',
            color: bookmarked ? '#06b6d4' : '#f1f5f9',
          }}
        >
          <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? 'Saved' : 'Watchlist'}
        </button>

        {/* Official Site */}
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

      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <TrailerModal
          videoKey={trailerKey}
          title={`${movieTitle} - Official Trailer`}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </>
  );
}
