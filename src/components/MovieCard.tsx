'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';
import { Movie, TVShow } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';

interface MovieCardProps {
  item: Movie | TVShow;
  type?: 'movie' | 'tv';
}

function isMovie(item: Movie | TVShow): item is Movie {
  return 'title' in item;
}

export default function MovieCard({ item, type = 'movie' }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const title = isMovie(item) ? item.title : item.name;
  const date = isMovie(item) ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : 'N/A';
  const rating = Math.round(item.vote_average * 10) / 10;
  const href = type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;

  const getRatingColor = (r: number) => {
    if (r >= 7) return '#22c55e';
    if (r >= 5) return '#eab308';
    return '#ef4444';
  };

  const getRatingBg = (r: number) => {
    if (r >= 7) return 'rgba(34,197,94,0.15)';
    if (r >= 5) return 'rgba(234,179,8,0.15)';
    return 'rgba(239,68,68,0.15)';
  };

  return (
    <Link href={href} className="block">
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer"
        style={{
          background: '#0f172a',
          border: isHovered ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.06)',
          transform: isHovered ? 'scale(1.05) translateY(-4px)' : 'scale(1) translateY(0)',
          boxShadow: isHovered
            ? '0 0 25px rgba(6,182,212,0.25), 0 20px 40px rgba(0,0,0,0.5)'
            : '0 4px 15px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {item.poster_path && !imgError ? (
            <Image
              src={getImageUrl(item.poster_path, 'w500')}
              alt={title}
              fill
              className="object-cover transition-transform duration-500"
              style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
            >
              <Play size={32} className="text-neo-text-muted" />
              <span className="text-neo-text-muted text-xs text-center px-2">{title}</span>
            </div>
          )}

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
            style={{
              background: 'rgba(5,8,22,0.7)',
              opacity: isHovered ? 1 : 0,
            }}
          >
            <div
              className="p-4 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 30px rgba(6,182,212,0.5)',
              }}
            >
              <Play size={24} className="text-white" fill="white" />
            </div>
          </div>

          {/* Rating badge */}
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold"
            style={{
              background: getRatingBg(rating),
              border: `1px solid ${getRatingColor(rating)}40`,
              color: getRatingColor(rating),
              backdropFilter: 'blur(4px)',
            }}
          >
            <Star size={10} fill="currentColor" />
            {rating.toFixed(1)}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3
            className="text-neo-text-primary text-sm font-semibold leading-tight truncate"
            title={title}
          >
            {title}
          </h3>
          <p className="text-neo-text-muted text-xs mt-1">{year}</p>
        </div>
      </div>
    </Link>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0f172a' }}>
      <div className="aspect-[2/3] w-full skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}
