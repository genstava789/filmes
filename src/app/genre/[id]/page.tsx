import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMoviesByGenre, getGenres, getGenreById } from '@/lib/tmdb';
import GenrePageClient from './GenrePageClient';

interface PageProps {
  params: { id: string };
  searchParams: { page?: string; sort?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const genre = await getGenreById(Number(params.id)).catch(() => null);
  return {
    title: genre ? `${genre.name} Movies - Filmanesia` : 'Genre - Filmanesia',
    description: genre ? `Browse ${genre.name} movies on Filmanesia.` : 'Browse movies by genre.',
  };
}

export const revalidate = 3600;

export default async function GenrePage({ params, searchParams }: PageProps) {
  const genreId = Number(params.id);
  if (isNaN(genreId)) notFound();

  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort || 'popularity.desc';

  const [genreData, moviesData, allGenres] = await Promise.allSettled([
    getGenreById(genreId),
    getMoviesByGenre(genreId, page, sort),
    getGenres(),
  ]);

  const genre = genreData.status === 'fulfilled' ? genreData.value : null;
  const movies = moviesData.status === 'fulfilled' ? moviesData.value : { results: [], total_pages: 0, total_results: 0, page: 1 };
  const genres = allGenres.status === 'fulfilled' ? allGenres.value : [];

  if (!genre) notFound();

  return (
    <GenrePageClient
      genre={genre}
      initialMovies={movies.results}
      totalPages={Math.min(movies.total_pages, 20)}
      totalResults={movies.total_results}
      initialPage={page}
      initialSort={sort}
      genreId={genreId}
      allGenres={genres}
    />
  );
}
