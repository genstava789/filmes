'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Star, Tv, Film } from 'lucide-react';
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
  const year = date ? new Date(date).getFullYear() : null;
  const rating = Math.round(item.vote_average * 10) / 10;
  const href = type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;

  const getRatingColor = (r: number) => {
    if (r >= 7) return '#4ade80';
    if (r >= 5) return '#facc15';
    return '#f87171';
  };

  return (
    <Link href={href} className="block">
      <div
        style={{
          position: 'relative',
          borderRadius: '14px',
          overflow: 'hidden',
          background: '#0c1224',
          border: isHovered
            ? '1px solid rgba(6,182,212,0.45)'
            : '1px solid rgba(255,255,255,0.07)',
          transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered
            ? '0 24px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(6,182,212,0.1)'
            : '0 4px 20px rgba(0,0,0,0.45)',
          transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── Poster area ── */}
        <div style={{ position: 'relative', aspectRatio: '2/3', width: '100%', overflow: 'hidden' }}>

          {/* Image */}
          {item.poster_path && !imgError ? (
            <Image
              src={getImageUrl(item.poster_path, 'w500')}
              alt={title}
              fill
              className="object-cover"
              style={{
                transform: isHovered ? 'scale(1.07)' : 'scale(1)',
                transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
              }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(145deg, #0f1a2e, #1a2540)',
              }}
            >
              <Film size={28} style={{ color: '#334155' }} />
              <span style={{ color: '#334155', fontSize: '11px', textAlign: 'center', padding: '0 8px' }}>{title}</span>
            </div>
          )}

          {/* Permanent deep gradient at bottom — title info lives here */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '62%',
              background: 'linear-gradient(to top, rgba(8,12,28,1) 0%, rgba(8,12,28,0.85) 35%, rgba(8,12,28,0.4) 65%, transparent 100%)',
              zIndex: 1,
            }}
          />

          {/* ── Rating badge — top right ── */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '3.5px',
              padding: '3px 7.5px',
              borderRadius: '7px',
              background: 'rgba(8,12,28,0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${getRatingColor(rating)}40`,
              color: getRatingColor(rating),
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
          >
            <Star size={11} fill="currentColor" />
            {rating.toFixed(1)}
          </div>

          {/* ── Type badge — top left ── */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '3.5px',
              padding: '3px 7.5px',
              borderRadius: '7px',
              background: 'rgba(8,12,28,0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}
          >
            {type === 'tv' ? <Tv size={11} /> : <Film size={11} />}
            {type === 'tv' ? 'Series' : 'Film'}
          </div>

          {/* ── Title + year — bottom overlay ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '0 10px 10px',
              zIndex: 2,
              transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
              transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <h3
              title={title}
              style={{
                color: '#f1f5f9',
                fontSize: '13px',
                fontWeight: 700,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
                marginBottom: year ? '3px' : 0,
              }}
            >
              {title}
            </h3>
            {year && (
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {year}
              </span>
            )}
          </div>

          {/* ── Hover play overlay ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(4,8,20,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.25s ease',
              zIndex: 4,
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 28px rgba(6,182,212,0.55), 0 0 60px rgba(124,58,237,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isHovered ? 'scale(1)' : 'scale(0.75)',
                transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <Play size={20} fill="white" color="white" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MovieCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#0c1224',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="skeleton"
        style={{ aspectRatio: '2/3', width: '100%' }}
      />
    </div>
  );
}
