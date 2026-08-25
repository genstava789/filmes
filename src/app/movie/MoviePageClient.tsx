'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Film, Sparkles } from 'lucide-react';
import { Movie, Genre } from '@/types/tmdb';
import { discoverMovies } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';
import GenreFilter from '@/components/GenreFilter';

interface MoviePageClientProps {
  initialMovies: Movie[];
  totalPages: number;
  totalResults: number;
  initialPage: number;
  initialSort: string;
  initialGenreId?: number;
  allGenres: Genre[];
}

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Highest Revenue' },
];

export default function MoviePageClient({
  initialMovies,
  totalPages: initialTotalPages,
  totalResults: initialTotalResults,
  initialPage,
  initialSort,
  initialGenreId,
  allGenres,
}: MoviePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState(initialSort);
  const [genreId, setGenreId] = useState<number | undefined>(initialGenreId);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalResults, setTotalResults] = useState(initialTotalResults);
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update when searchParams change externally
  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const s = searchParams.get('sort') || 'popularity.desc';
    const g = searchParams.get('genre') ? Number(searchParams.get('genre')) : undefined;

    setPage(p);
    setSort(s);
    setGenreId(g);
  }, [searchParams]);

  // Fetch movies when filter/sort/page change
  useEffect(() => {
    if (page === initialPage && sort === initialSort && genreId === initialGenreId) return;

    setLoading(true);
    discoverMovies(page, sort, genreId)
      .then((data) => {
        setMovies(data.results);
        setTotalPages(Math.min(data.total_pages, 20));
        setTotalResults(data.total_results);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [page, sort, genreId, initialPage, initialSort, initialGenreId]);

  const updateUrl = (newPage: number, newSort: string, newGenreId?: number) => {
    const params = new URLSearchParams();
    if (newSort && newSort !== 'popularity.desc') params.set('sort', newSort);
    if (newPage > 1) params.set('page', String(newPage));
    if (newGenreId) params.set('genre', String(newGenreId));

    const qs = params.toString();
    router.push(qs ? `/movie?${qs}` : '/movie', { scroll: false });
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
    setSortOpen(false);
    updateUrl(1, newSort, genreId);
  };

  const handleGenreChange = (newGenreId?: number) => {
    setGenreId(newGenreId);
    setPage(1);
    updateUrl(1, sort, newGenreId);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, sort, genreId);
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort';
  const activeGenreName = allGenres.find((g) => g.id === genreId)?.name;

  return (
    <div className="min-h-screen pt-24 pb-16" style={{ background: '#050816' }}>
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                    border: '1px solid rgba(6,182,212,0.4)',
                    color: '#06b6d4',
                  }}
                >
                  <Sparkles size={11} />
                  Movie Catalog
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-1">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {activeGenreName ? `${activeGenreName} Movies` : 'Explore Movies'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-medium" style={{ color: '#94a3b8' }}>
                {totalResults.toLocaleString()} movies available to stream
              </p>
            </div>

            {/* Sort dropdown */}
            <div className="relative self-start sm:self-auto" ref={sortRef}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                }}
              >
                <SlidersHorizontal size={15} />
                <span className="whitespace-nowrap">{currentSortLabel}</span>
                <ChevronRight
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: sortOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {sortOpen && (
                <div
                  className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-30"
                  style={{
                    background: '#0B1020',
                    border: '1px solid rgba(6,182,212,0.3)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="w-full px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors duration-150 hover:bg-white/5"
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
            <GenreFilter
              genres={allGenres}
              activeGenreId={genreId}
              type="movie"
              allHref="/movie"
            />
          </div>
        )}

        {/* Movies grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} item={movie} type="movie" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-6 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Film size={48} style={{ color: '#475569' }} />
            </div>
            <p className="text-neo-text-secondary text-lg">No movies found matching the criteria.</p>
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
