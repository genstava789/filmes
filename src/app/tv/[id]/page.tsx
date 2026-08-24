'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Play, Star, Clock, Calendar, ArrowLeft, Bookmark } from 'lucide-react';
import { TVShowDetail } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';
import CastCard from '@/components/CastCard';
import TrailerModal from '@/components/TrailerModal';
import RatingBadge from '@/components/RatingBadge';
import { PageLoader } from '@/components/LoadingSpinner';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'ea0c8bc1b7235d9e19b457c965b658ad';
const BASE_URL = process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3';

async function getTVDetails(id: number): Promise<TVShowDetail> {
  const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=videos,credits,similar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch TV details');
  return res.json();
}

export default function TVDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [show, setShow] = useState<TVShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTVDetails(id)
      .then((data) => {
        setShow(data);
        const trailer = data.videos?.results?.find(
          (v) => v.type === 'Trailer' && v.site === 'YouTube'
        ) || data.videos?.results?.[0];
        if (trailer) setTrailerKey(trailer.key);
      })
      .catch(() => setError('Failed to load TV show details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error || !show) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center">
          <p className="text-neo-text-secondary text-lg mb-4">{error || 'Show not found.'}</p>
          <Link href="/tv" className="text-neo-cyan hover:underline">← Back to TV Shows</Link>
        </div>
      </div>
    );
  }

  const cast = show.credits?.cast?.slice(0, 12) || [];
  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : '';
  const runtime = show.episode_run_time?.[0] ? `${show.episode_run_time[0]}m / ep` : null;

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* Backdrop */}
      <div className="relative w-full" style={{ height: 'clamp(400px, 65vh, 650px)' }}>
        {show.backdrop_path && (
          <div className="absolute inset-0">
            <Image
              src={getImageUrl(show.backdrop_path, 'w1280')}
              alt={show.name}
              fill
              priority
              className="object-cover transition-opacity duration-700"
              style={{ opacity: imgLoaded ? 1 : 0 }}
              sizes="100vw"
              onLoad={() => setImgLoaded(true)}
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(5,8,22,0.3) 0%, rgba(5,8,22,0.6) 50%, rgba(5,8,22,1) 100%)',
          }}
        />
        <div className="absolute top-20 left-4 sm:left-8">
          <Link
            href="/tv"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(5,8,22,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
            }}
          >
            <ArrowLeft size={16} />
            TV Shows
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ marginTop: '-180px', position: 'relative', zIndex: 10 }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: '200px',
                height: '300px',
                border: '2px solid rgba(236,72,153,0.3)',
                boxShadow: '0 0 40px rgba(236,72,153,0.2), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {show.poster_path ? (
                <Image
                  src={getImageUrl(show.poster_path, 'w500')}
                  alt={show.name}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f172a' }}>
                  <Play size={48} className="text-neo-text-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-2" style={{ color: '#f1f5f9' }}>
              {show.name}
            </h1>

            {show.tagline && (
              <p className="text-lg italic mb-4" style={{ color: '#ec4899' }}>
                &ldquo;{show.tagline}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <RatingBadge rating={show.vote_average} size="lg" />
              {year && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
                  <Calendar size={14} />
                  {year}
                </div>
              )}
              {runtime && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
                  <Clock size={14} />
                  {runtime}
                </div>
              )}
              {show.number_of_seasons && (
                <div
                  className="px-3 py-1 rounded-lg text-sm"
                  style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', color: '#ec4899' }}
                >
                  {show.number_of_seasons} Season{show.number_of_seasons > 1 ? 's' : ''}
                </div>
              )}
              {show.number_of_episodes && (
                <div
                  className="px-3 py-1 rounded-lg text-sm"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
                >
                  {show.number_of_episodes} Episodes
                </div>
              )}
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {show.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.4)',
                      color: '#a78bfa',
                    }}
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-base leading-relaxed mb-6" style={{ color: '#94a3b8', maxWidth: '640px' }}>
              {show.overview}
            </p>

            <div className="flex flex-wrap gap-3">
              {trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                    color: 'white',
                    boxShadow: '0 0 20px rgba(236,72,153,0.4)',
                  }}
                >
                  <Play size={18} fill="white" />
                  Watch Trailer
                </button>
              )}
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: bookmarked ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.08)',
                  border: bookmarked ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  color: bookmarked ? '#ec4899' : '#f1f5f9',
                }}
              >
                <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                {bookmarked ? 'Saved' : 'Watchlist'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
              {[
                { label: 'Status', value: show.status || 'N/A' },
                { label: 'Seasons', value: show.number_of_seasons?.toString() || 'N/A' },
                { label: 'Episodes', value: show.number_of_episodes?.toString() || 'N/A' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-lg font-bold" style={{ color: '#ec4899' }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-16">
            <h2 className="section-title text-2xl font-bold text-neo-text-primary mb-6">Cast</h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {cast.map((member) => (
                <CastCard key={member.id} cast={member} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showTrailer && trailerKey && (
        <TrailerModal
          videoKey={trailerKey}
          title={`${show.name} - Trailer`}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
