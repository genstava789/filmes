import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Calendar, Clock, Globe, Sparkles, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import {
  getMovieDetailsWithCustomOverride,
  getAllCustomMovieSlugs,
} from '@/lib/markdownMovies';
import MovieCard from '@/components/MovieCard';
import CastCard from '@/components/CastCard';
import RatingBadge from '@/components/RatingBadge';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MovieDetailClient from '@/components/MovieDetailClient';
import VideoPlayer from '@/components/VideoPlayer';
import siteConfig from '@/config';

export const dynamicParams = true;
export const revalidate = 3600;

interface PageProps {
  params: {
    id: string;
  };
}

/**
 * Pre-generates static params for all custom markdown movies in video/
 */
export async function generateStaticParams() {
  const customMovieSlugs = await getAllCustomMovieSlugs();
  return customMovieSlugs.map((slug) => ({
    id: slug,
  }));
}

/**
 * Dynamic metadata generation for SEO & OpenGraph
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await getMovieDetailsWithCustomOverride(params.id).catch(() => null);

  if (!movie) {
    return {
      title: `Movie Not Found - ${siteConfig.name}`,
    };
  }

  const title = `${movie.title} ${movie.release_date ? `(${new Date(movie.release_date).getFullYear()})` : ''} - ${siteConfig.name}`;
  const description = movie.overview ? movie.overview.slice(0, 160) : `Watch movies and stream online on ${siteConfig.name}.`;

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
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew?.find((c) => c.job === 'Director');
  const cast = movie.credits?.cast?.slice(0, 14) || [];
  const similarMovies = movie.similar?.results?.slice(0, 14) || [];
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
          name: siteConfig.name,
          logo: {
            '@type': 'ImageObject',
            url: siteConfig.logoUrl,
          },
        },
      }
    : null;

  return (
    <div className="min-h-screen pb-12" style={{ background: '#050816' }}>
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

      {/* ── 1. FULL-VIEW VIDEO PLAYER (Fit all body) ── */}
      {videoUrl && (
        <div className="w-full bg-black mb-5">
          <VideoPlayer
            videoUrl={videoUrl}
            title={videoTitle}
            poster={thumbnailImage}
          />
        </div>
      )}

      {/* ── 2. MOVIE METADATA & ACTIONS ── */}
      <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 ${videoUrl ? 'pt-2' : 'pt-6'}`}>
        {/* Title above rating/HD badges */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight mb-3 tracking-tight text-white">
          {movie.title}
        </h1>

        {/* Meta Badges Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
              <Calendar size={14} />
              {year}
            </div>
          )}
          {runtime && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
              <Clock size={14} />
              {runtime}
            </div>
          )}
          {movie.original_language && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
              <Globe size={14} />
              {movie.original_language.toUpperCase()}
            </div>
          )}
        </div>

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {movie.genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/genre/${genre.id}`}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.35)',
                  color: '#a78bfa',
                }}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        )}

        {/* Overview / Sinopsis */}
        <p className="text-xs sm:text-sm sm:leading-relaxed leading-normal mb-5 max-w-4xl text-slate-300">
          {movie.overview}
        </p>

        {/* Director */}
        {director && (
          <p className="text-xs sm:text-sm mb-5 text-slate-400">
            <span className="text-white font-semibold">Director: </span>
            {director.name}
          </p>
        )}

        {/* Action Buttons (Watch Trailer, Watchlist, Share) */}
        <MovieDetailClient
          movieTitle={movie.title}
          trailerKey={trailerKey}
          homepage={movie.homepage}
          hasCustomVideo={Boolean(movie.customVideoUrl)}
        />
      </div>

      {/* ── 3. CUSTOM MARKDOWN BODY CONTENT ── */}
      {movie.customContentHtml && (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-8">
          <MarkdownRenderer
            contentHtml={movie.customContentHtml}
            title={movie.title}
          />
        </div>
      )}

      {/* ── 4. CAST SECTION (Large Circular Profile Avatars) ── */}
      {cast.length > 0 && (
        <section className="mt-10 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Top Cast & Characters
            </h2>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3">
            {cast.map((member) => (
              <CastCard key={member.id} cast={member} />
            ))}
          </div>
        </section>
      )}

      {/* ── 5. SIMILAR MOVIES (GRID LAYOUT WITH ATTRACTIVE ICON) ── */}
      {similarMovies.length > 0 && (
        <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
              }}
            >
              <Sparkles size={16} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Similar Movies
              </h2>
              <p className="text-[11px] text-slate-400">
                Recommendations tailored for you
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
            {similarMovies.map((item) => (
              <MovieCard key={item.id} item={item} type="movie" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
