'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Movie, Genre } from '@/types/tmdb';
import { getMoviesByGenre } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';
import GenreFilter from '@/components/GenreFilter';

interface GenrePageClientProps {
  genre: Genre;
  initialMovies: Movie[];
  totalPages: number;
  totalResults: number;
  initialPage: number;
  initialSort: string;
  genreId: number;
  allGenres: Genre[];
}

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Highest Revenue' },
];

export default function GenrePageClient({
  genre,
  initialMovies,
  totalPages: initialTotalPages,
  totalResults: initialTotalResults,
  initialPage,
  initialSort,
  genreId,
  allGenres,
}: GenrePageClientProps) {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState(initialSort);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalResults, setTotalResults] = useState(initialTotalResults);
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (page === initialPage && sort === initialSort) return;
    setLoading(true);
    getMoviesByGenre(genreId, page, sort)
      .then((data) => {
        setMovies(data.results);
        setTotalPages(Math.min(data.total_pages, 20));
        setTotalResults(data.total_results);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [page, sort, genreId, initialPage, initialSort]);

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
    setSortOpen(false);
    router.push(`/genre/${genreId}?sort=${newSort}&page=1`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/genre/${genreId}?sort=${sort}&page=${newPage}`, { scroll: false });
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort';

  return (
    <div className="min-h-screen pt-24 pb-16" style={{ background: '#050816' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {genre.name}
                </span>{' '}
                <span style={{ color: '#f1f5f9' }}>Movies</span>
              </h1>
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                {totalResults.toLocaleString()} movies found
              </p>
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                }}
              >
                <SlidersHorizontal size={16} />
                {currentSortLabel}
                <ChevronRight
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: sortOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {sortOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
                  style={{
                    background: '#0B1020',
                    border: '1px solid rgba(6,182,212,0.3)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="w-full px-4 py-3 text-left text-sm transition-colors duration-150 hover:bg-white/5"
                      style={{
                        color: sort === option.value ? '#06b6d4' : '#94a3b8',
                        fontWeight: sort === option.value ? 600 : 400,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Genre filter */}
        {allGenres.length > 0 && (
          <div className="mb-8">
            <GenreFilter genres={allGenres} activeGenreId={genreId} />
          </div>
        )}

        {/* Movies grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} item={movie} type="movie" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-neo-text-secondary text-lg">No movies found for this genre.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
            >
              <ChevronLeft size={20} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                  style={
                    page === pageNum
                      ? {
                          background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 0 15px rgba(6,182,212,0.3)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#94a3b8',
                        }
                  }
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
