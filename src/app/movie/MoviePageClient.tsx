'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { Movie, Genre } from '@/types/tmdb';
import { discoverMovies, getGenres, prefetchImages } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';
import GenreFilter from '@/components/GenreFilter';

interface MoviePageClientProps {
  initialMovies?: Movie[];
  totalPages?: number;
  totalResults?: number;
  initialPage?: number;
  initialSort?: string;
  initialGenreId?: number;
  allGenres?: Genre[];
}

const movieClientCache = new Map<string, any>();

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Highest Revenue' },
];

function sortLocalMovies(items: Movie[], sortOption: string): Movie[] {
  const copy = [...items];
  if (sortOption === 'vote_average.desc') {
    return copy.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  }
  if (sortOption === 'release_date.desc') {
    return copy.sort((a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime());
  }
  if (sortOption === 'release_date.asc') {
    return copy.sort((a, b) => new Date(a.release_date || 0).getTime() - new Date(b.release_date || 0).getTime());
  }
  if (sortOption === 'popularity.desc') {
    return copy.sort((a, b) => (b.popularity || 100) - (a.popularity || 100));
  }
  return copy;
}

export default function MoviePageClient({
  initialMovies = [],
  totalPages: initialTotalPages = 1,
  totalResults: initialTotalResults = 0,
  initialPage = 1,
  initialSort = 'popularity.desc',
  initialGenreId,
  allGenres: propGenres = [],
}: MoviePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [genres, setGenres] = useState<Genre[]>(propGenres);
  const [movies, setMovies] = useState<Movie[]>(() =>
    initialMovies.length > 0 ? sortLocalMovies(initialMovies, initialSort) : []
  );
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState(initialSort);
  const [genreId, setGenreId] = useState<number | undefined>(initialGenreId);
  const [totalPages, setTotalPages] = useState(
    initialMovies.length > 0 ? Math.max(1, Math.ceil(initialMovies.length / 20)) : Math.min(initialTotalPages, 500)
  );
  const [totalResults, setTotalResults] = useState(initialMovies.length > 0 ? initialMovies.length : initialTotalResults);
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);

  // Fetch genres if not provided
  useEffect(() => {
    if (genres.length === 0) {
      getGenres()
        .then((g) => setGenres(g))
        .catch(() => {});
    }
  }, [genres.length]);

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

  // Sync state when searchParams change (e.g. browser back/forward)
  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const s = searchParams.get('sort') || 'popularity.desc';
    const g = searchParams.get('genre') ? Number(searchParams.get('genre')) : undefined;

    setPage(p);
    setSort(s);
    setGenreId(g);
  }, [searchParams]);

  // Fetch or filter movies when filter/sort/page change
  useEffect(() => {
    // 1. If browsing page 1 without genre filter and local movies exist:
    if (page === 1 && !genreId && initialMovies.length > 0) {
      const sorted = sortLocalMovies(initialMovies, sort);
      setMovies(sorted);
      setTotalPages(Math.max(1, Math.ceil(initialMovies.length / 20)));
      setTotalResults(initialMovies.length);
      setLoading(false);
      return;
    }

    // 2. If genre filter is active and local movies match that genre:
    if (genreId && initialMovies.length > 0) {
      const localGenreMatches = initialMovies.filter((m) => m.genre_ids && m.genre_ids.includes(genreId));
      if (localGenreMatches.length > 0 && page === 1) {
        const sorted = sortLocalMovies(localGenreMatches, sort);
        setMovies(sorted);
        setTotalPages(Math.max(1, Math.ceil(localGenreMatches.length / 20)));
        setTotalResults(localGenreMatches.length);
        setLoading(false);
        return;
      }
    }

    const cacheKey = `${page}_${sort}_${genreId || 'all'}`;
    if (movieClientCache.has(cacheKey)) {
      const cached = movieClientCache.get(cacheKey);
      setMovies(cached.results);
      setTotalPages(Math.min(cached.total_pages, 500));
      setTotalResults(cached.total_results);
      setLoading(false);
      return;
    }

    setLoading(true);
    discoverMovies(page, sort, genreId)
      .then((data) => {
        movieClientCache.set(cacheKey, data);
        setMovies(data.results);
        const maxPages = Math.min(data.total_pages, 500);
        setTotalPages(maxPages);
        setTotalResults(data.total_results);
        prefetchImages(data.results);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [page, sort, genreId, initialMovies]);

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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    updateUrl(newPage, sort, genreId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort';

  // Helper to build page numbers array with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-4 sm:pb-6" style={{ background: '#050816' }}>
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
        
        {/* ── Page Header: Title on Left, Sort Dropdown on Right ── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black truncate sm:whitespace-normal mb-1">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Browse Movies
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-medium" style={{ color: '#94a3b8' }}>
                Jelajahi <span className="text-cyan-400 font-bold">{totalResults > 0 ? totalResults.toLocaleString() : '129'}</span> movie untuk ditonton
              </p>
            </div>

            {/* Sort Dropdown - pinned to top right */}
            <div className="relative flex-shrink-0" ref={sortRef}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                }}
              >
                <SlidersHorizontal size={14} className="sm:w-[15px] sm:h-[15px] text-cyan-400" />
                <span className="whitespace-nowrap">{currentSortLabel}</span>
                <ChevronRight
                  size={13}
                  className="transition-transform duration-200"
                  style={{ transform: sortOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {sortOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 sm:w-48 rounded-xl overflow-hidden z-30"
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
                      className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm transition-colors duration-150 hover:bg-white/5"
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

        {/* ── Browse by Genre Filter ── */}
        {genres.length > 0 && (
          <div className="mb-8">
            <GenreFilter
              genres={genres}
              activeGenreId={genreId}
              type="movie"
              allHref="/movie"
              hideTitle={true}
            />
          </div>
        )}

        {/* ── Movies Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5 md:gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5 md:gap-5">
            {movies.map((movie, i) => (
              <MovieCard key={movie.id} item={movie} type="movie" priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-6 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Film size={48} style={{ color: '#475569' }} />
            </div>
            <p className="text-neo-text-secondary text-lg">No movies found.</p>
          </div>
        )}

        {/* ── Pagination with Large Page Window and Go-To-Top ── */}
        {totalPages > 1 && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-10 mb-2">
            {/* Prev button */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className="p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dynamic Page numbers with ellipsis */}
            {getPageNumbers().map((item, idx) => {
              if (item === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-bold text-slate-500 select-none"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = item as number;
              const isCurrent = page === pageNum;

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105"
                  style={
                    isCurrent
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

            {/* Next button */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className="p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
