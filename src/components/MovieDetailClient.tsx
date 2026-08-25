'use client';

import React, { useState } from 'react';
import { Bookmark, Film } from 'lucide-react';
import TrailerModal from '@/components/TrailerModal';
import ShareButton from '@/components/ShareButton';

interface MovieDetailClientProps {
  movieTitle: string;
  trailerKey?: string | null;
  homepage?: string | null;
  hasCustomVideo?: boolean;
}

export default function MovieDetailClient({
  movieTitle,
  trailerKey,
}: MovieDetailClientProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Watch Trailer Button */}
        {trailerKey && (
          <button
            onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 18px rgba(6,182,212,0.35)',
            }}
          >
            <Film size={16} />
            <span>Watch Trailer</span>
          </button>
        )}

        {/* Bookmark Button */}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: bookmarked ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.06)',
            border: bookmarked
              ? '1px solid rgba(6,182,212,0.5)'
              : '1px solid rgba(255,255,255,0.1)',
            color: bookmarked ? '#06b6d4' : '#f1f5f9',
          }}
        >
          <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
          <span>{bookmarked ? 'Saved' : 'Watchlist'}</span>
        </button>

        {/* Share Button */}
        <ShareButton title={movieTitle} />
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
