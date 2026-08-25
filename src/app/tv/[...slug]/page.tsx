import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Calendar, Clock } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import {
  getTVShowDetailsWithCustomOverride,
  getAllCustomTVSlugPaths,
} from '@/lib/markdownTV';
import MovieCard from '@/components/MovieCard';
import CastCard from '@/components/CastCard';
import RatingBadge from '@/components/RatingBadge';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TVDetailClient, { TVDetailHeaderActions } from '@/components/TVDetailClient';
import siteConfig from '@/config';

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
      title: `TV Show Not Found - ${siteConfig.name}`,
    };
  }

  const epTitle = data.activeEpisode ? ` - ${data.activeEpisode.episodeLabel}: ${data.activeEpisode.title}` : '';
  const title = `${data.name}${epTitle} - ${siteConfig.name}`;
  const description = data.activeEpisode?.overview || data.overview || `Watch TV shows and stream episodes online on ${siteConfig.name}.`;

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
            Kembali ke TV Shows
          </Link>
        </div>
      </div>
    );
  }

  const cast = data.credits?.cast?.slice(0, 14) || [];
  const similarShows = data.similar?.results?.slice(0, 14) || [];
  const year = data.first_air_date ? new Date(data.first_air_date).getFullYear() : '';
  const runtime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]}m / ep` : null;

  // Extract official trailer if available
  const trailer =
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    data.videos?.results?.[0];
  const trailerKey = trailer?.key || null;

  const defaultBackdrop = data.customImageUrl || (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : undefined);

  const videoUrl = data.activeEpisode?.videoUrl || null;
  const videoTitle = data.activeEpisode
    ? `${data.name} - ${data.activeEpisode.episodeLabel}: ${data.activeEpisode.title}`
    : data.name;
  const videoDescription = data.activeEpisode?.overview || data.overview || `Nonton streaming ${videoTitle} full episode kualitas HD sub indo.`;
  const uploadDate = data.first_air_date ? `${data.first_air_date}T00:00:00+07:00` : '2026-08-24T00:00:00+07:00';
  const durationIso = formatIsoDuration(data.activeEpisode?.duration || data.episode_run_time?.[0] || '50m');
  const thumbnailImage = data.activeEpisode?.imageUrl || data.customImageUrl || (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : data.poster_path ? getImageUrl(data.poster_path, 'w500') : '/placeholder-poster.jpg');

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

      {/* ── 1. FULL-VIEW VIDEO PLAYER & EPISODE SELECTOR (At the very top) ── */}
      <div className="w-full mb-6">
        <TVDetailClient
          showTitle={data.name}
          seasons={data.seasonsList || []}
          hasSeasons={Boolean(data.hasSeasons)}
          initialActiveEpisode={data.activeEpisode || null}
          defaultBackdrop={defaultBackdrop}
        />
      </div>

      {/* ── 2. TV SHOW DETAILS SECTION ── */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-2">
        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight mb-2 tracking-tight text-white"
        >
          {data.name}
        </h1>

        {/* Tagline */}
        {data.tagline && (
          <p className="text-sm sm:text-base italic mb-4" style={{ color: '#a78bfa' }}>
            &ldquo;{data.tagline}&rdquo;
          </p>
        )}

        {/* Meta Badges Row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <RatingBadge rating={data.vote_average} size="md" />
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
          {data.overview}
        </p>

        {/* Action Buttons (Watch Trailer, Watchlist) */}
        <TVDetailHeaderActions
          activeEpisodeLabel={data.activeEpisode?.episodeLabel}
          activeEpisodeTitle={data.activeEpisode?.title}
          hasVideo={Boolean(data.activeEpisode?.videoUrl)}
          trailerKey={trailerKey}
          homepage={data.homepage}
          showTitle={data.name}
        />
      </div>

      {/* ── 3. SHOW OVERVIEW MARKDOWN CONTENT ── */}
      {data.customContentHtml && (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-10">
          <MarkdownRenderer
            contentHtml={data.customContentHtml}
            title={`${data.name} - Informasi & Sinopsis Serial`}
          />
        </div>
      )}

      {/* ── 4. CAST SECTION (Bigger & Clearer UI on Small Screen) ── */}
      {cast.length > 0 && (
        <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 tracking-tight">
            Top Cast
          </h2>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3">
            {cast.map((member) => (
              <CastCard key={member.id} cast={member} />
            ))}
          </div>
        </section>
      )}

      {/* ── 5. SIMILAR TV SHOWS (GRID LAYOUT) ── */}
      {similarShows.length > 0 && (
        <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5 tracking-tight">
            Similar TV Shows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
            {similarShows.map((item) => (
              <MovieCard key={item.id} item={item} type="tv" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
