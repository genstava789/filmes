import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Play,
  Calendar,
  Clock,
  Globe,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import {
  getMovieDetailsWithCustomOverride,
  getAllCustomMovieSlugs,
} from '@/lib/markdownMovies';
import MovieRow from '@/components/MovieRow';
import CastCard from '@/components/CastCard';
import RatingBadge from '@/components/RatingBadge';
import VideoPlayer from '@/components/VideoPlayer';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MovieDetailClient from '@/components/MovieDetailClient';

export const dynamicParams = true;
export const revalidate = 3600;

interface PageProps {
  params: {
    id: string;
  };
}

/**
 * Pre-generates static params for all custom markdown files in video/
 */
export async function generateStaticParams() {
  const customSlugs = getAllCustomMovieSlugs();
  return customSlugs.map((slug) => ({
    id: slug,
  }));
}

/**
 * Dynamic metadata generation for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await getMovieDetailsWithCustomOverride(params.id).catch(() => null);

  if (!movie) {
    return {
      title: 'Movie Not Found - Filmanesia',
    };
  }

  const title = `${movie.title} ${movie.release_date ? `(${new Date(movie.release_date).getFullYear()})` : ''} - Filmanesia`;
  const description = movie.overview ? movie.overview.slice(0, 160) : 'Watch movies and stream online on Filmanesia.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: movie.backdrop_path
        ? [getImageUrl(movie.backdrop_path, 'w1280')]
        : movie.poster_path
        ? [getImageUrl(movie.poster_path, 'w500')]
        : [],
    },
  };
}

function formatIsoDuration(duration?: string | number | null): string {
  if (!duration) return 'PT1H30M';
  if (typeof duration === 'number') {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0 && minutes > 0) return `PT${hours}H${minutes}M`;
    if (hours > 0) return `PT${hours}H`;
    return `PT${minutes}M`;
  }
  const str = String(duration).trim().toLowerCase();
  const matchH = str.match(/(\d+)\s*h/);
  const matchM = str.match(/(\d+)\s*m/);
  const hours = matchH ? parseInt(matchH[1], 10) : 0;
  const minutes = matchM ? parseInt(matchM[1], 10) : 0;
  if (hours > 0 && minutes > 0) return `PT${hours}H${minutes}M`;
  if (hours > 0) return `PT${hours}H`;
  if (minutes > 0) return `PT${minutes}M`;
  const plainNum = parseInt(str, 10);
  if (!isNaN(plainNum) && plainNum > 0) return `PT${plainNum}M`;
  return 'PT1H30M';
}

export default async function MovieDetailPage({ params }: PageProps) {
  const movie = await getMovieDetailsWithCustomOverride(params.id).catch(() => null);

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-2">Film Tidak Ditemukan</h2>
          <p className="text-neo-text-secondary text-sm mb-6">
            Data untuk movie ID atau file markdown &ldquo;{params.id}&rdquo; tidak ditemukan.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              color: 'white',
            }}
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
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

  // Extract official trailer if available
  const trailer =
    movie.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
    movie.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    movie.videos?.results?.[0];
  const trailerKey = trailer?.key || null;

  const thumbnailImage =
    movie.customImageUrl ||
    (movie.backdrop_path
      ? getImageUrl(movie.backdrop_path, 'w1280')
      : movie.poster_path
      ? getImageUrl(movie.poster_path, 'w500')
      : '/placeholder-poster.jpg');

  const videoUrl = movie.customVideoUrl || null;
  const videoTitle = `${movie.title} ${year ? `(${year})` : ''}`;
  const videoDescription = movie.overview || `Nonton full streaming film ${movie.title} sub indo kualitas HD.`;
  const uploadDate = movie.release_date ? `${movie.release_date}T00:00:00+07:00` : '2026-08-24T00:00:00+07:00';
  const durationIso = formatIsoDuration(movie.runtime || '120m');

  const videoObjectSchema = videoUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: videoTitle,
        description: videoDescription,
        thumbnailUrl: [thumbnailImage],
        uploadDate: uploadDate,
        duration: durationIso,
        contentUrl: videoUrl,
        embedUrl: videoUrl,
        publisher: {
          '@type': 'Organization',
          name: 'Filmanesia',
          logo: {
            '@type': 'ImageObject',
            url: 'https://filmanesia.vercel.app/logo.png',
          },
        },
      }
    : null;

  return (
    <div className="min-h-screen pb-16" style={{ background: '#050816' }}>
      {/* OpenGraph Video & Schema.org VideoObject */}
      {videoUrl && (
        <>
          <meta property="og:video:url" content={videoUrl} />
          <meta property="og:video:type" content="video/mp4" />
          {videoObjectSchema && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObjectSchema, null, 2) }}
            />
          )}
        </>
      )}

      {/* Top Header Bar with Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f1f5f9',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </Link>
      </div>

      {/* ── TOP: Full-View Video Player (iQiyi Style) ── */}
      {videoUrl ? (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4">
          <VideoPlayer
            videoUrl={videoUrl}
            title={movie.title}
            poster={getImageUrl(movie.backdrop_path || movie.poster_path, 'w1280')}
          />
        </div>
      ) : (
        /* Fallback Backdrop Section if no direct videoUrl */
        <div className="relative w-full" style={{ height: 'clamp(320px, 50vh, 500px)' }}>
          {movie.backdrop_path && (
            <div className="absolute inset-0">
              <Image
                src={getImageUrl(movie.backdrop_path, 'w1280')}
                alt={movie.title}
                fill
                priority
                className="object-cover"
                sizes="100vw"
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
        </div>
      )}

      {/* ── DIRECTLY BELOW: Movie Details & Meta Info ── */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${videoUrl ? 'mt-8' : '-mt-24 relative z-10'}`}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Poster Card */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: '200px',
                height: '300px',
                border: '2px solid rgba(6,182,212,0.35)',
                boxShadow: '0 0 35px rgba(6,182,212,0.18), 0 20px 50px rgba(0,0,0,0.6)',
              }}
            >
              {movie.poster_path ? (
                <Image
                  src={getImageUrl(movie.poster_path, 'w500')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="200px"
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

          {/* Info Details */}
          <div className="flex-1 min-w-0">
            {/* Custom Static Badge */}
            {movie.isCustomMarkdown && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                  border: '1px solid rgba(6,182,212,0.5)',
                  color: '#06b6d4',
                }}
              >
                <Sparkles size={12} />
                Static Custom Edition
              </div>
            )}

            {/* Title */}
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-2"
              style={{ color: '#f1f5f9' }}
            >
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-base sm:text-lg italic mb-4" style={{ color: '#7c3aed' }}>
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta badges row (with HD badge) */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <RatingBadge rating={movie.vote_average} size="md" />
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider"
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#06b6d4',
                }}
              >
                HD
              </span>
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
            <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: '#94a3b8', maxWidth: '680px' }}>
              {movie.overview}
            </p>

            {/* Director */}
            {director && (
              <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Director: </span>
                {director.name}
              </p>
            )}

            {/* Action buttons (Client interactive) */}
            <MovieDetailClient
              movieTitle={movie.title}
              trailerKey={trailerKey}
              homepage={movie.homepage}
              hasCustomVideo={Boolean(movie.customVideoUrl)}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Vote Count', value: movie.vote_count?.toLocaleString() || '1,000+' },
                { label: 'Popularity', value: Math.round(movie.popularity || 100).toLocaleString() },
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
      </div>

      {/* Custom Markdown Body Rendered Section */}
      {movie.customContentHtml && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <MarkdownRenderer
            contentHtml={movie.customContentHtml}
            title={movie.title}
          />
        </div>
      )}

      {/* Cast Section */}
      {cast.length > 0 && (
        <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-xl sm:text-2xl font-bold text-neo-text-primary mb-4">
            Cast
          </h2>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-2">
            {cast.map((member) => (
              <CastCard key={member.id} cast={member} />
            ))}
          </div>
        </section>
      )}

      {/* Similar Movies Section */}
      {similarMovies.length > 0 && (
        <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MovieRow
            title="Similar Movies"
            items={similarMovies}
            type="movie"
            noPadding
          />
        </section>
      )}
    </div>
  );
}
