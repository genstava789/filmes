import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  Tv,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import {
  getTVShowDetailsWithCustomOverride,
  getAllCustomTVSlugPaths,
} from '@/lib/markdownTV';
import MovieRow from '@/components/MovieRow';
import CastCard from '@/components/CastCard';
import RatingBadge from '@/components/RatingBadge';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TVDetailClient, { TVDetailHeaderActions } from '@/components/TVDetailClient';

export const dynamicParams = true;
export const revalidate = 3600;

interface PageProps {
  params: {
    slug: string[];
  };
}

/**
 * Pre-generates static params for all custom TV shows, seasons, and episodes in tv/
 */
export async function generateStaticParams() {
  const customPaths = await getAllCustomTVSlugPaths();
  return customPaths;
}

/**
 * Dynamic metadata generation for SEO & OpenGraph
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getTVShowDetailsWithCustomOverride(params.slug).catch(() => null);

  if (!data) {
    return {
      title: 'TV Show Not Found - Filmanesia',
    };
  }

  const epTitle = data.activeEpisode ? ` - ${data.activeEpisode.episodeLabel}: ${data.activeEpisode.title}` : '';
  const title = `${data.name}${epTitle} - Filmanesia`;
  const description = data.activeEpisode?.overview || data.overview || 'Watch TV shows and stream episodes online on Filmanesia.';

  const image = data.activeEpisode?.imageUrl ||
    data.customImageUrl ||
    (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : data.poster_path ? getImageUrl(data.poster_path, 'w500') : undefined);

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      images: image ? [image] : [],
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

export default async function TVShowPage({ params }: PageProps) {
  const data = await getTVShowDetailsWithCustomOverride(params.slug).catch(() => null);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-2">Serial TV Tidak Ditemukan</h2>
          <p className="text-neo-text-secondary text-sm mb-6">
            Data untuk serial TV atau episode &ldquo;{params.slug.join('/')}&rdquo; tidak ditemukan.
          </p>
          <Link
            href="/tv"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              color: 'white',
            }}
          >
            <ArrowLeft size={16} />
            Kembali ke TV Shows
          </Link>
        </div>
      </div>
    );
  }

  const cast = data.credits?.cast?.slice(0, 12) || [];
  const similarShows = data.similar?.results?.slice(0, 12) || [];
  const year = data.first_air_date ? new Date(data.first_air_date).getFullYear() : '';
  const runtime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]}m / ep` : null;

  // Extract official trailer if available
  const trailer =
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    data.videos?.results?.[0];
  const trailerKey = trailer?.key || null;

  const defaultBackdrop = data.customImageUrl || (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : undefined);
  const thumbnailImage = data.activeEpisode?.imageUrl || data.customImageUrl || (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : data.poster_path ? getImageUrl(data.poster_path, 'w500') : '/placeholder-poster.jpg');

  const videoUrl = data.activeEpisode?.videoUrl || null;
  const videoTitle = data.activeEpisode
    ? `${data.name} - ${data.activeEpisode.episodeLabel}: ${data.activeEpisode.title}`
    : data.name;
  const videoDescription = data.activeEpisode?.overview || data.overview || `Nonton streaming ${videoTitle} full episode kualitas HD sub indo.`;
  const uploadDate = data.first_air_date ? `${data.first_air_date}T00:00:00+07:00` : '2026-08-24T00:00:00+07:00';
  const durationIso = formatIsoDuration(data.activeEpisode?.duration || data.episode_run_time?.[0] || '50m');

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

      {/* Backdrop Section */}
      <div className="relative w-full" style={{ height: 'clamp(400px, 70vh, 700px)' }}>
        {(data.customImageUrl || data.backdrop_path) && (
          <div className="absolute inset-0">
            <Image
              src={data.customImageUrl || getImageUrl(data.backdrop_path, 'w1280')}
              alt={data.name}
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
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(5,8,22,0.85) 0%, transparent 60%)',
          }}
        />

        {/* Back button */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-8 z-30">
          <Link
            href="/tv"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(5, 8, 22, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            <ArrowLeft size={16} />
            <span>TV Shows</span>
          </Link>
        </div>
      </div>

      {/* Main TV Show Info Details */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ marginTop: '-200px', position: 'relative', zIndex: 10 }}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster Card */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: '220px',
                height: '330px',
                border: '2px solid rgba(6,182,212,0.35)',
                boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {data.poster_path || data.customImageUrl ? (
                <Image
                  src={
                    data.poster_path
                      ? getImageUrl(data.poster_path, 'w500')
                      : (data.customImageUrl || '/placeholder-poster.jpg')
                  }
                  alt={data.name}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f172a' }}>
                  <Tv size={48} className="text-neo-text-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Info Details */}
          <div className="flex-1 min-w-0">
            {/* Custom Static Badge */}
            {data.isCustomTV && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{
                  background: 'rgba(6,182,212,0.15)',
                  border: '1px solid rgba(6,182,212,0.4)',
                  color: '#06b6d4',
                }}
              >
                <Sparkles size={12} />
                Static Custom Serial
              </div>
            )}

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-2"
              style={{ color: '#f1f5f9' }}
            >
              {data.name}
            </h1>

            {/* Tagline */}
            {data.tagline && (
              <p className="text-lg italic mb-4" style={{ color: '#7c3aed' }}>
                &ldquo;{data.tagline}&rdquo;
              </p>
            )}

            {/* Meta Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <RatingBadge rating={data.vote_average} size="md" />
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
              {data.hasSeasons && data.number_of_seasons ? (
                <div
                  className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(6,182,212,0.12)',
                    border: '1px solid rgba(6,182,212,0.35)',
                    color: '#06b6d4',
                  }}
                >
                  {data.number_of_seasons} Season{data.number_of_seasons > 1 ? 's' : ''}
                </div>
              ) : null}
              {data.number_of_episodes ? (
                <div
                  className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    color: '#a78bfa',
                  }}
                >
                  {data.number_of_episodes} Episodes
                </div>
              ) : null}
            </div>

            {/* Genres */}
            {data.genres && data.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {data.genres.map((genre) => (
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
              {data.overview}
            </p>

            {/* Action Buttons */}
            <TVDetailHeaderActions
              activeEpisodeLabel={data.activeEpisode?.episodeLabel}
              activeEpisodeTitle={data.activeEpisode?.title}
              hasVideo={Boolean(data.activeEpisode?.videoUrl)}
              trailerKey={trailerKey}
              homepage={data.homepage}
              showTitle={data.name}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Status', value: data.status || 'Ongoing' },
                {
                  label: 'Seasons',
                  value: data.hasSeasons
                    ? (data.number_of_seasons?.toString() || '1')
                    : '1 Season',
                },
                { label: 'Total Episodes', value: data.number_of_episodes?.toString() || 'N/A' },
                { label: 'Vote Count', value: data.vote_count?.toLocaleString() || '1,000+' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-lg font-bold" style={{ color: '#06b6d4' }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Interactive Player & Bilibili Episode Selector Section */}
      <TVDetailClient
        showTitle={data.name}
        seasons={data.seasonsList || []}
        hasSeasons={Boolean(data.hasSeasons)}
        initialActiveEpisode={data.activeEpisode || null}
        defaultBackdrop={defaultBackdrop}
      />

      {/* Show Overview Markdown Content */}
      {data.customContentHtml && (
        <MarkdownRenderer
          contentHtml={data.customContentHtml}
          title={`${data.name} - Informasi & Sinopsis Serial`}
        />
      )}

      {/* Cast Section */}
      {cast.length > 0 && (
        <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-xl sm:text-2xl font-bold text-neo-text-primary mb-4">Cast & Karakter</h2>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-2">
            {cast.map((member) => (
              <CastCard key={member.id} cast={member} />
            ))}
          </div>
        </section>
      )}

      {/* Similar TV Shows */}
      {similarShows.length > 0 && (
        <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MovieRow
            title="Serial TV Serupa"
            items={similarShows}
            type="tv"
            noPadding
          />
        </section>
      )}
    </div>
  );
}
