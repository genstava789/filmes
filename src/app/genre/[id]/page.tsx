import React from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getGenres,
  getTVGenres,
  getGenreById,
  getTVGenreById,
} from '@/lib/tmdb';
import { getAllCustomMoviesForList } from '@/lib/markdownMovies';
import { getAllCustomTVShowsForList } from '@/lib/markdownTV';
import GenrePageClient from './GenrePageClient';
import siteConfig from '@/config';

interface PageProps {
  params: { id: string };
  searchParams: { page?: string; sort?: string; type?: string; lang?: string };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const isTV = searchParams.type === 'tv';
  const genreId = Number(params.id);
  const genre = isTV
    ? await getTVGenreById(genreId).catch(() => null)
    : await getGenreById(genreId).catch(() => null);

  const mediaLabel = isTV ? 'TV Series' : 'Movies';

  return {
    title: genre ? `${genre.name} ${mediaLabel} - ${siteConfig.name}` : `Genre - ${siteConfig.name}`,
    description: genre
      ? `Browse ${genre.name} ${mediaLabel.toLowerCase()} on ${siteConfig.name}.`
      : `Browse ${mediaLabel.toLowerCase()} by genre.`,
  };
}

export const revalidate = 15;

export default async function GenrePage({ params, searchParams }: PageProps) {
  const genreId = Number(params.id);
  if (isNaN(genreId)) notFound();

  const isTV = searchParams.type === 'tv';
  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort || 'popularity.desc';
  const initialLang = (searchParams.lang || 'en').toLowerCase();

  const [genreData, localItemsData, allGenres] = await Promise.allSettled([
    isTV ? getTVGenreById(genreId) : getGenreById(genreId),
    isTV ? getAllCustomTVShowsForList() : getAllCustomMoviesForList(),
    isTV ? getTVGenres().catch(() => getGenres()) : getGenres(),
  ]);

  const genre =
    genreData.status === 'fulfilled' && genreData.value
      ? genreData.value
      : isTV
      ? await getGenreById(genreId).catch(() => null)
      : null;

  const rawLocalItems = localItemsData.status === 'fulfilled' ? localItemsData.value : [];
  const genres = allGenres.status === 'fulfilled' ? allGenres.value : [];

  if (!genre) notFound();

  // Filter local items strictly matching this genre ID
  const genreMatchedItems = rawLocalItems.filter(
    (item: any) => Array.isArray(item.genre_ids) && item.genre_ids.includes(genreId)
  );

  // If this genre has no local data, redirect to All Genres (/movie or /tv/browse)
  if (genreMatchedItems.length === 0) {
    redirect(isTV ? '/tv/browse' : '/movie');
  }

  return (
    <GenrePageClient
      genre={genre}
      initialGenreId={genreId}
      allLocalItems={rawLocalItems}
      initialPage={page}
      initialSort={sort}
      initialLanguage={initialLang === 'id' ? 'id' : initialLang === 'all' ? 'all' : 'en'}
      allGenres={genres}
      type={isTV ? 'tv' : 'movie'}
    />
  );
}
