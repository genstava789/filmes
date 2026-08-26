import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Calendar, Clock, Sparkles, Users, Folder, ChevronLeft } from 'lucide-react';
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
import TVEpisodeList from '@/components/TVEpisodeList';
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

  const isEpisodePage = params.slug.length > 1;
  const epTitle = isEpisodePage && data.activeEpisode
    ? ` - ${data.activeEpisode.episodeLabel}: ${data.activeEpisode.title}`
    : '';
  const title = `${data.name}${epTitle} - ${siteConfig.name}`;
  const description = isEpisodePage && data.activeEpisode?.overview
    ? data.activeEpisode.overview
    : data.overview || `Watch TV shows and stream episodes online on ${siteConfig.name}.`;

  const image = isEpisodePage && data.activeEpisode?.imageUrl
    ? data.activeEpisode.imageUrl
    : data.customImageUrl ||
      (data.backdrop_path ? getImageUrl(data.backdrop_path, 'w1280') : data.poster_path ? getImageUrl(data.poster_path, 'w500') : undefined);

  const videoUrl = isEpisodePage && data.activeEpisode?.videoUrl ? data.activeEpisode.videoUrl : null;
  const videoType = videoUrl && videoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: isEpisodePage ? 'video.episode' : 'video.tv_show',
      images: image ? [image] : [],
      videos: videoUrl
        ? [
            {
              url: videoUrl,
              secureUrl: videoUrl,
              type: videoType,
              width: 1920,
              height: 1080,
            },
          ]
        : [],
    },
    other: videoUrl
      ? {
          'og:type': 'video.other',
          'og:video': videoUrl,
          'og:video:url': videoUrl,
          'og:video:secure_url': videoUrl,
          'og:video:type': videoType,
          'og:video:width': '1920',
          'og:video:height': '1080',
          'twitter:card': 'player',
          'twitter:player': videoUrl,
          'twitter:player:width': '1920',
          'twitter:player:height': '1080',
          'twitter:player:stream': videoUrl,
          'twitter:player:stream:content_type': videoType,
          'video_src': videoUrl,
        }
      : {},
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
            Data untuk URL serial TV &ldquo;{params.slug.join('/')}&rdquo; tidak ditemukan.
          </p>
          <Link
            href="/tv"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
          >
            <ChevronLeft size={18} />
            <span>Kembali ke Katalog Serial TV</span>
          </Link>
        </div>
      </div>
    );
  }

  const isEpisodePage = params.slug.length > 1;
  const activeEpisode = data.activeEpisode || null;
  const showSlug = params.slug[0];
  const videoUrl = activeEpisode?.videoUrl || null;
  const videoType = videoUrl && videoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';

  const cast = data.credits?.cast?.slice(0, 14) || [];
  const similarShows = data.similar?.results?.slice(0, 14) || [];
  const year = data.first_air_date ? new Date(data.first_air_date).getFullYear() : '';
  const runtime = data.episode_run_time?.[0] ? `${data.episode_run_time[0]}m / ep` : null;

  const trailer =
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
    data.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
    data.videos?.results?.[0];
  const trailerKey = trailer?.key || null;

  const defaultBackdrop = data.customImageUrl || (data.backdrop_path ? getImageUrl(data.backdrop_path, 'original') : undefined);
  const thumbnailImage = activeEpisode?.imageUrl || defaultBackdrop || (data.poster_path ? getImageUrl(data.poster_path, 'w500') : '');

  const videoTitle = isEpisodePage && activeEpisode
    ? `${data.name} - ${activeEpisode.episodeLabel}: ${activeEpisode.title}`
    : data.name;
  const videoDescription = activeEpisode?.overview || data.overview || `Streaming serial TV ${data.name} full episode sub indo.`;
  const uploadDate = data.first_air_date ? `${data.first_air_date}T00:00:00+07:00` : '2026-08-24T00:00:00+07:00';
  const durationIso = formatIsoDuration(activeEpisode?.duration || data.episode_run_time?.[0] || '45m');

  const videoObjectSchema = isEpisodePage && videoUrl
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
      {/* OpenGraph Video & Schema.org VideoObject (Only on Episode page with video) */}
      {isEpisodePage && videoUrl && (
        <>
          <link rel="video_src" href={videoUrl} />
          <meta property="og:video" content={videoUrl} />
          <meta property="og:video:url" content={videoUrl} />
          <meta property="og:video:secure_url" content={videoUrl} />
          <meta property="og:video:type" content={videoType} />
          <meta property="og:video:width" content="1920" />
          <meta property="og:video:height" content="1080" />
          {videoObjectSchema && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObjectSchema, null, 2) }}
            />
          )}
        </>
      )}

      {/* ── CASE A: EPISODE PLAYBACK PAGE (slug.length > 1) ── */}
      {isEpisodePage ? (
        <>
          {/* Top Video Player + Bilibili.tv-Style Grid / Pill Episode Selector */}
          <div className="w-full mb-6">
            <TVDetailClient
              showTitle={data.name}
              seasons={data.seasonsList || []}
              hasSeasons={Boolean(data.hasSeasons)}
              initialActiveEpisode={data.activeEpisode || null}
              defaultBackdrop={defaultBackdrop}
            />
          </div>

          {/* Similar TV Shows */}
          {similarShows.length > 0 && (
            <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(124, 58, 237, 0.2))',
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)',
                  }}
                >
                  <Sparkles size={16} className="text-pink-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Similar TV Shows
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Recommendations tailored for you
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {similarShows.map((item) => (
                  <MovieCard key={item.id} item={item} type="tv" />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* ── CASE B: TV OVERVIEW PAGE (slug.length === 1, NO PLAYER) ── */
        <>
          {/* Header Metadata Section */}
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-6">
            {/* Title above rating/HD badges */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight mb-3 tracking-tight text-white">
              {data.name}
            </h1>

            {/* Meta Badges Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
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
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(6,182,212,0.12)',
                    border: '1px solid rgba(6,182,212,0.35)',
                    color: '#06b6d4',
                  }}
                >
                  <Folder size={13} />
                  <span>{data.number_of_seasons} Season{data.number_of_seasons > 1 ? 's' : ''}</span>
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
              <div className="flex flex-wrap gap-2 mb-4">
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

            {/* Action Buttons (Watch Trailer, Watchlist, Share) */}
            <TVDetailHeaderActions
              activeEpisodeLabel={data.activeEpisode?.episodeLabel}
              activeEpisodeTitle={data.activeEpisode?.title}
              hasVideo={Boolean(data.activeEpisode?.videoUrl)}
              trailerKey={trailerKey}
              homepage={data.homepage}
              showTitle={data.name}
            />
          </div>

          {/* Show Overview Markdown Content */}
          {data.customContentHtml && (
            <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-8">
              <MarkdownRenderer
                contentHtml={data.customContentHtml}
                title={`${data.name} - Informasi & Sinopsis Serial`}
              />
            </div>
          )}

          {/* Top Cast & Characters */}
          {cast.length > 0 && (
            <section className="mt-10 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-pink-400" />
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

          {/* Episodes List UI (Below Top Cast) */}
          {data.seasonsList && data.seasonsList.length > 0 && (
            <TVEpisodeList
              seasons={data.seasonsList}
              hasSeasons={Boolean(data.hasSeasons)}
              showTitle={data.name}
              showSlug={showSlug}
              defaultBackdrop={defaultBackdrop}
            />
          )}

          {/* Similar TV Shows (Grid) */}
          {similarShows.length > 0 && (
            <section className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(124, 58, 237, 0.2))',
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)',
                  }}
                >
                  <Sparkles size={16} className="text-pink-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Similar TV Shows
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Recommendations tailored for you
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {similarShows.map((item) => (
                  <MovieCard key={item.id} item={item} type="tv" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
