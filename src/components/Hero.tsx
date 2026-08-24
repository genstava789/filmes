'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, Star, Calendar, Clock } from 'lucide-react';
import { Movie } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';

interface HeroProps {
  movie: Movie;
  genres?: { id: number; name: string }[];
}

export default function Hero({ movie, genres = [] }: HeroProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const movieGenres = genres.filter((g) => movie.genre_ids?.includes(g.id)).slice(0, 3);
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const rating = Math.round(movie.vote_average * 10) / 10;

  const getRatingColor = (r: number) => {
    if (r >= 7) return '#22c55e';
    if (r >= 5) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'clamp(500px, 85vh, 800px)' }}>
      {/* Backdrop image */}
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

      {/* Gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(5,8,22,0.95) 0%, rgba(5,8,22,0.7) 40%, rgba(5,8,22,0.2) 70%, rgba(5,8,22,0.1) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(5,8,22,1) 0%, rgba(5,8,22,0.5) 30%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,8,22,0.4) 0%, transparent 20%)',
        }}
      />

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          style={{ animation: 'slideUp 0.8s ease-out forwards' }}
        >
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                  border: '1px solid rgba(6,182,212,0.4)',
                  color: '#06b6d4',
                }}
              >
                ✦ Featured
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4"
              style={{
                color: '#f1f5f9',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              {movie.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Rating */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{
                  background: `rgba(${rating >= 7 ? '34,197,94' : rating >= 5 ? '234,179,8' : '239,68,68'},0.15)`,
                  border: `1px solid ${getRatingColor(rating)}40`,
                  color: getRatingColor(rating),
                }}
              >
                <Star size={14} fill="currentColor" />
                {rating.toFixed(1)}
              </div>

              {/* Year */}
              {year && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                  }}
                >
                  <Calendar size={13} />
                  {year}
                </div>
              )}

              {/* Vote count */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                }}
              >
                <Clock size={13} />
                {movie.vote_count?.toLocaleString()} votes
              </div>
            </div>

            {/* Genres */}
            {movieGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movieGenres.map((genre) => (
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
            <p
              className="text-base leading-relaxed mb-8 line-clamp-3"
              style={{ color: '#94a3b8', maxWidth: '540px' }}
            >
              {movie.overview}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/movie/${movie.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  color: 'white',
                  boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                }}
              >
                <Play size={18} fill="white" />
                Watch Now
              </Link>
              <Link
                href={`/movie/${movie.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#f1f5f9',
                }}
              >
                <Info size={18} />
                More Info
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #050816)',
        }}
      />
    </div>
  );
}
