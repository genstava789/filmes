import {
  Movie,
  MovieDetail,
  TMDBResponse,
  Genre,
  GenreListResponse,
  TVShow,
  TVShowDetail,
} from '@/types/tmdb';

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'ea0c8bc1b7235d9e19b457c965b658ad';
const BASE_URL = process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

type ImageSize = 'w200' | 'w300' | 'w400' | 'w500' | 'w780' | 'w1280' | 'original';

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText} for ${endpoint}`);
  }

  return response.json() as Promise<T>;
}

export function getImageUrl(path: string | null, size: ImageSize = 'w500'): string {
  if (!path) return '/placeholder-poster.jpg';
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export async function getTrending(
  mediaType: 'movie' | 'tv' = 'movie',
  timeWindow: 'day' | 'week' = 'week'
): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>(`/trending/${mediaType}/${timeWindow}`);
}

export async function getPopularMovies(page: number = 1): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>('/movie/popular', { page: String(page) });
}

export async function getNowPlayingMovies(page: number = 1): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>('/movie/now_playing', { page: String(page) });
}

export async function getTopRatedMovies(page: number = 1): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>('/movie/top_rated', { page: String(page) });
}

export async function getMovieDetails(id: number): Promise<MovieDetail> {
  return fetchTMDB<MovieDetail>(`/movie/${id}`, {
    append_to_response: 'videos,credits,similar',
  });
}

export async function searchMovies(query: string, page: number = 1): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>('/search/movie', {
    query: encodeURIComponent(query),
    page: String(page),
    include_adult: 'false',
  });
}

export async function getMoviesByGenre(genreId: number, page: number = 1, sortBy: string = 'popularity.desc'): Promise<TMDBResponse<Movie>> {
  return fetchTMDB<TMDBResponse<Movie>>('/discover/movie', {
    with_genres: String(genreId),
    page: String(page),
    sort_by: sortBy,
  });
}

export async function getGenres(): Promise<Genre[]> {
  const data = await fetchTMDB<GenreListResponse>('/genre/movie/list');
  return data.genres;
}

export async function getPopularTV(page: number = 1): Promise<TMDBResponse<TVShow>> {
  return fetchTMDB<TMDBResponse<TVShow>>('/tv/popular', { page: String(page) });
}

export async function getTrendingTV(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBResponse<TVShow>> {
  return fetchTMDB<TMDBResponse<TVShow>>(`/trending/tv/${timeWindow}`);
}

export async function getTopRatedTV(page: number = 1): Promise<TMDBResponse<TVShow>> {
  return fetchTMDB<TMDBResponse<TVShow>>('/tv/top_rated', { page: String(page) });
}

export async function getAiringTodayTV(page: number = 1): Promise<TMDBResponse<TVShow>> {
  return fetchTMDB<TMDBResponse<TVShow>>('/tv/airing_today', { page: String(page) });
}

export async function getGenreById(genreId: number): Promise<Genre | null> {
  const genres = await getGenres();
  return genres.find((g) => g.id === genreId) || null;
}

export async function getTVGenres(): Promise<Genre[]> {
  const data = await fetchTMDB<GenreListResponse>('/genre/tv/list');
  return data.genres;
}

export async function getTVShowDetails(id: number): Promise<TVShowDetail> {
  return fetchTMDB<TVShowDetail>(`/tv/${id}`, {
    append_to_response: 'videos,credits,similar',
  });
}

