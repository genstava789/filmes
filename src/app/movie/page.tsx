import React from 'react';
import type { Metadata } from 'next';
import { discoverMovies, getGenres, getGenreById } from '@/lib/tmdb';
import MoviePageClient from './MoviePageClient';
import siteConfig from '@/config';

interface MoviePageProps {
  searchParams: { page?: string; sort?: string; genre?: string };
}

export async function generateMetadata({ searchParams }: MoviePageProps): Promise<Metadata> {
  const genreId = searchParams.genre ? Number(searchParams.genre) : undefined;
  const genre = genreId ? await getGenreById(genreId).catch(() => null) : null;

  return {
    title: genre ? `${genre.name} Movies - ${siteConfig.name}` : `Explore Movies - ${siteConfig.name}`,
    description: genre
      ? `Browse ${genre.name} movies on ${siteConfig.name}. Stream online in HD quality.`
      : `Explore thousands of movies on ${siteConfig.name}. Watch popular, top-rated, and trending movies in HD.`,
  };
}

export const revalidate = 3600;

export default async function MoviePage({ searchParams }: MoviePageProps) {
  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort || 'popularity.desc';
  const genreId = searchParams.genre ? Number(searchParams.genre) : undefined;

  const [moviesData, genresData] = await Promise.allSettled([
    discoverMovies(page, sort, genreId),
    getGenres(),
  ]);

  const movies =
    moviesData.status === 'fulfilled'
      ? moviesData.value
      : { results: [], total_pages: 0, total_results: 0, page: 1 };
  const allGenres = genresData.status === 'fulfilled' ? genresData.value : [];

  return (
    <MoviePageClient
      initialMovies={movies.results}
      totalPages={Math.min(movies.total_pages, 20)}
      totalResults={movies.total_results}
      initialPage={page}
      initialSort={sort}
      initialGenreId={genreId}
      allGenres={allGenres}
    />
  );
}
