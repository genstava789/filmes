import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails, getTVShowDetails, getImageUrl } from '@/lib/tmdb';
import { extractTmdbIdAndType } from '@/lib/urls';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get('id');
  const queryType = searchParams.get('type') || 'movie'; // 'movie' or 'tv'

  const extracted = extractTmdbIdAndType(idStr);
  if (!extracted.id) {
    return NextResponse.json({ error: 'Valid numeric TMDB ID or TMDB URL is required' }, { status: 400 });
  }

  const tmdbId = Number(extracted.id);
  const type = extracted.type || queryType;

  try {
    if (type === 'tv') {
      const show = await getTVShowDetails(tmdbId);
      if (!show) {
        return NextResponse.json({ error: 'TV Show not found on TMDB' }, { status: 404 });
      }
      return NextResponse.json({
        id: show.id,
        title: show.name,
        overview: show.overview,
        posterUrl: show.poster_path ? getImageUrl(show.poster_path, 'w500') : null,
        backdropUrl: show.backdrop_path ? getImageUrl(show.backdrop_path, 'w1280') : null,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
        rating: show.vote_average ? Math.round(show.vote_average * 10) / 10 : null,
        numberOfSeasons: show.number_of_seasons || 1,
        numberOfEpisodes: show.number_of_episodes || 1,
        genres: show.genres?.map((g) => g.name) || [],
      });
    } else {
      const movie = await getMovieDetails(tmdbId);
      if (!movie) {
        return NextResponse.json({ error: 'Movie not found on TMDB' }, { status: 404 });
      }
      return NextResponse.json({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterUrl: movie.poster_path ? getImageUrl(movie.poster_path, 'w500') : null,
        backdropUrl: movie.backdrop_path ? getImageUrl(movie.backdrop_path, 'w1280') : null,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
        runtime: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null,
        genres: movie.genres?.map((g) => g.name) || [],
      });
    }
  } catch (err: any) {
    console.error('Error fetching TMDB preview:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch from TMDB' }, { status: 500 });
  }
}
