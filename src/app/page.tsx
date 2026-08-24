import React from 'react';
import Hero from '@/components/Hero';
import MovieRow from '@/components/MovieRow';
import GenreFilter from '@/components/GenreFilter';
import {
  getTrending,
  getPopularMovies,
  getNowPlayingMovies,
  getTopRatedMovies,
  getTrendingTV,
  getGenres,
} from '@/lib/tmdb';
import { getAllFeaturedCustomMovies } from '@/lib/markdownMovies';
import { getAllFeaturedCustomTV } from '@/lib/markdownTV';
import siteConfig, { FeaturedItem } from '@/config';

export const revalidate = 3600;

export default async function HomePage() {
  const [
    trendingData,
    popularData,
    nowPlayingData,
    topRatedData,
    trendingTVData,
    genres,
    customFeaturedMovies,
    customFeaturedTV,
  ] = await Promise.allSettled([
    getTrending('movie', 'week'),
    getPopularMovies(1),
    getNowPlayingMovies(1),
    getTopRatedMovies(1),
    getTrendingTV('week'),
    getGenres(),
    getAllFeaturedCustomMovies(),
    getAllFeaturedCustomTV(),
  ]);

  const trending = trendingData.status === 'fulfilled' ? trendingData.value.results : [];
  const popular = popularData.status === 'fulfilled' ? popularData.value.results : [];
  const nowPlaying = nowPlayingData.status === 'fulfilled' ? nowPlayingData.value.results : [];
  const topRated = topRatedData.status === 'fulfilled' ? topRatedData.value.results : [];
  const trendingTV = trendingTVData.status === 'fulfilled' ? trendingTVData.value.results : [];
  const genreList = genres.status === 'fulfilled' ? genres.value : [];

  const mdFeaturedMovies: FeaturedItem[] =
    customFeaturedMovies.status === 'fulfilled' ? customFeaturedMovies.value : [];
  const mdFeaturedTV: FeaturedItem[] =
    customFeaturedTV.status === 'fulfilled' ? customFeaturedTV.value : [];

  // Combine custom markdown featured items (from video/ and tv/) with siteConfig.featuredItems
  const combinedFeatured: FeaturedItem[] = [
    ...mdFeaturedMovies,
    ...mdFeaturedTV,
    ...(siteConfig.featuredItems || []),
  ];

  // Deduplicate by title or id
  const uniqueFeatured: FeaturedItem[] = [];
  const seenIds = new Set<string>();

  for (const item of combinedFeatured) {
    const key = `${item.type || 'item'}-${item.title}`.toLowerCase();
    if (!seenIds.has(key)) {
      seenIds.add(key);
      uniqueFeatured.push(item);
    }
  }

  const featuredMovie = trending[0] || popular[0];

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* Hero with 3 Featured Items Carousel */}
      <Hero
        movie={featuredMovie}
        movies={trending}
        genres={genreList}
        customFeaturedItems={uniqueFeatured.length > 0 ? uniqueFeatured.slice(0, 5) : undefined}
      />

      {/* Content sections */}
      <div className="relative z-10 space-y-12 pb-16 pt-2 sm:pt-4">
        {/* Genre Filter */}
        {genreList.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <GenreFilter genres={genreList} />
          </section>
        )}

        {/* Trending Movies */}
        {trending.length > 0 && (
          <MovieRow
            title="🔥 Trending This Week"
            items={trending}
            seeAllHref="/genre/28"
            type="movie"
          />
        )}

        {/* Now Playing */}
        {nowPlaying.length > 0 && (
          <MovieRow
            title="🎬 Now Playing"
            items={nowPlaying}
            seeAllHref="/genre/28"
            type="movie"
          />
        )}

        {/* Popular Movies */}
        {popular.length > 0 && (
          <MovieRow
            title="⭐ Popular Movies"
            items={popular}
            seeAllHref="/genre/28"
            type="movie"
          />
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <MovieRow
            title="🏆 Top Rated"
            items={topRated}
            seeAllHref="/genre/18"
            type="movie"
          />
        )}

        {/* Trending TV */}
        {trendingTV.length > 0 && (
          <MovieRow
            title="📺 Trending TV Shows"
            items={trendingTV}
            seeAllHref="/tv"
            type="tv"
          />
        )}
      </div>
    </div>
  );
}
