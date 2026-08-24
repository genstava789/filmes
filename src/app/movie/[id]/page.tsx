'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Play,
  Star,
  Clock,
  Calendar,
  Globe,
  ArrowLeft,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { MovieDetail } from '@/types/tmdb';
import { getMovieDetails, getImageUrl } from '@/lib/tmdb';
import MovieRow from '@/components/MovieRow';
import CastCard from '@/components/CastCard';
import TrailerModal from '@/components/TrailerModal';
import RatingBadge from '@/components/RatingBadge';
import { PageLoader } from '@/components/LoadingSpinner';

export default function MovieDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getMovieDetails(id)
      .then((data) => {
        setMovie(data);
        const trailer = data.videos?.results?.find(
          (v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official
        ) || data.videos?.results?.find(
          (v) => v.type === 'Trailer' && v.site === 'YouTube'
        ) || data.videos?.results?.[0];
        if (trailer) setTrailerKey(trailer.key);
      })
      .catch(() => setError('Failed to load movie details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center">
          <p className="text-neo-text-secondary text-lg mb-4">{error || 'Movie not found.'}</p>
          <Link href="/" className="text-neo-cyan hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew?.find((c) => c.job === 'Director');
  const cast = movie.credits?.cast?.slice(0, 12) || [];
  const similarMovies = movie.similar?.results?.slice(0, 12) || [];
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* Backdrop */}
      <div className="relative w-full" style={{ height: 'clamp(400px, 70vh, 700px)' }}>
        {movie.backdrop_path && (
          <div className="absolute inset-0">
            <Image
              src={getImageUrl(movie.backdrop_path, 'w1280')}
              alt={movie.title}
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
            background:
              'linear-gradient(to bottom, rgba(5,8,22,0.3) 0%, rgba(5,8,22,0.6) 50%, rgba(5,8,22,1) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(5,8,22,0.8) 0%, transparent 60%)',
          }}
        />

        {/* Back button */}
        <div className="absolute top-20 left-4 sm:left-8">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(5,8,22,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ marginTop: '-200px', position: 'relative', zIndex: 10 }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: '220px',
                height: '330px',
                border: '2px solid rgba(6,182,212,0.3)',
                boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {movie.poster_path ? (
                <Image
                  src={getImageUrl(movie.poster_path, 'w500')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: '#0f172a' }}
                >
                  <Play size={48} className="text-neo-text-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-2"
              style={{ color: '#f1f5f9' }}
            >
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-lg italic mb-4" style={{ color: '#7c3aed' }}>
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <RatingBadge rating={movie.vote_average} size="lg" />
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
              {movie.original_language && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
                  <Globe size={14} />
                  {movie.original_language.toUpperCase()}
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/${genre.id}`}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.4)',
                      color: '#a78bfa',
                    }}
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="text-base leading-relaxed mb-6" style={{ color: '#94a3b8', maxWidth: '640px' }}>
              {movie.overview}
            </p>

            {/* Director */}
            {director && (
              <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Director: </span>
                {director.name}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    color: 'white',
                    boxShadow: '0 0 20px rgba(6,182,212,0.4)',
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
                  background: bookmarked ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  border: bookmarked ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  color: bookmarked ? '#06b6d4' : '#f1f5f9',
                }}
              >
                <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                {bookmarked ? 'Saved' : 'Watchlist'}
              </button>
              {movie.homepage && (
                <a
                  href={movie.homepage}
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Vote Count', value: movie.vote_count?.toLocaleString() },
                { label: 'Popularity', value: Math.round(movie.popularity).toLocaleString() },
                { label: 'Budget', value: movie.budget ? `$${(movie.budget / 1e6).toFixed(1)}M` : 'N/A' },
                { label: 'Revenue', value: movie.revenue ? `$${(movie.revenue / 1e6).toFixed(1)}M` : 'N/A' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p className="text-lg font-bold" style={{ color: '#06b6d4' }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-16">
            <h2 className="section-title text-2xl font-bold text-neo-text-primary mb-6">
              Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {cast.map((member) => (
                <CastCard key={member.id} cast={member} />
              ))}
            </div>
          </section>
        )}

        {/* Similar Movies */}
        {similarMovies.length > 0 && (
          <section className="mt-16">
            <MovieRow
              title="Similar Movies"
              items={similarMovies}
              type="movie"
            />
          </section>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <TrailerModal
          videoKey={trailerKey}
          title={`${movie.title} - Trailer`}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
