'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Film,
  Sparkles,
} from 'lucide-react';
import { Movie, Genre } from '@/types/tmdb';
import { discoverMovies, searchMovies } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';
import GenreFilter from '@/components/GenreFilter';

interface MoviePageClientProps {
  initialMovies: Movie[];
  totalPages: number;
  totalResults: number;
  initialPage: number;
  initialSort: string;
  initialGenreId?: number;
  initialQuery?: string;
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
  initialQuery = '',
  allGenres,
}: MoviePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState(initialSort);
  const [genreId, setGenreId] = useState<number | undefined>(initialGenreId);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
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

  // Sync state when searchParams change (e.g. browser back/forward)
  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const s = searchParams.get('sort') || 'popularity.desc';
    const g = searchParams.get('genre') ? Number(searchParams.get('genre')) : undefined;
    const q = searchParams.get('q') || '';

    setPage(p);
    setSort(s);
    setGenreId(g);
    setSearchQuery(q);
    setSearchInput(q);
  }, [searchParams]);

  // Fetch movies when query/sort/genre/page changes
  useEffect(() => {
    if (
      page === initialPage &&
      sort === initialSort &&
      genreId === initialGenreId &&
      searchQuery === initialQuery
    ) {
      return;
    }

    setLoading(true);

    const fetcher = searchQuery.trim()
      ? searchMovies(searchQuery.trim(), page)
      : discoverMovies(page, sort, genreId);

    fetcher
      .then((data) => {
        setMovies(data.results);
        setTotalPages(Math.min(data.total_pages, 20));
        setTotalResults(data.total_results);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [page, sort, genreId, searchQuery, initialPage, initialSort, initialGenreId, initialQuery]);

  const updateUrl = (newPage: number, newSort: string, newGenreId?: number, newQ?: string) => {
    const params = new URLSearchParams();
    if (newQ && newQ.trim()) params.set('q', newQ.trim());
    if (newSort && newSort !== 'popularity.desc') params.set('sort', newSort);
    if (newPage > 1) params.set('page', String(newPage));
    if (newGenreId) params.set('genre', String(newGenreId));

    const qs = params.toString();
    router.push(qs ? `/movie?${qs}` : '/movie', { scroll: false });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearchQuery(trimmed);
    setPage(1);
    updateUrl(1, sort, genreId, trimmed);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    updateUrl(1, sort, genreId, '');
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
    setSortOpen(false);
    updateUrl(1, newSort, genreId, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, sort, genreId, searchQuery);
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort';
  const activeGenreName = allGenres.find((g) => g.id === genreId)?.name;

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#050816' }}>
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
        
        {/* ── Top Header Hero Card with Integrated Search ── */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 md:p-10 mb-8 border transition-all duration-300"
          style={{
            background:
              'radial-gradient(ellipse at 50% -20%, rgba(124, 58, 237, 0.25) 0%, rgba(6, 182, 212, 0.12) 45%, rgba(11, 16, 32, 0.95) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow:
              '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Subtle Background Glow Accent */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-30"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                border: '1px solid rgba(6,182,212,0.4)',
                color: '#06b6d4',
              }}
            >
              <Sparkles size={13} />
              <span>Movie Discovery</span>
            </div>

            {/* Main Heading: Browse Movies */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
              <span
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #a78bfa, #f43f5e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Browse Movies
              </span>
            </h1>

            {/* Center Advanced Search Bar UI */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative max-w-2xl mx-auto flex items-center gap-2 group"
            >
              <div
                className="relative flex-1 flex items-center rounded-2xl overflow-hidden transition-all duration-300 focus-within:border-cyan-500/60 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
                style={{
                  background: 'rgba(5, 8, 22, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="pl-4 sm:pl-5 text-cyan-400 flex items-center justify-center pointer-events-none">
                  <Search size={18} />
                </div>

                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search movies by title, actors, or keywords..."
                  className="w-full bg-transparent px-3.5 py-3.5 sm:py-4 text-xs sm:text-sm font-medium text-white placeholder-slate-400 focus:outline-none"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-2 mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Clear Search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Action Button */}
              <button
                type="submit"
                className="px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-bold text-xs sm:text-sm text-white transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.35)',
                }}
              >
                <Search size={15} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>

            {/* Active Search / Genre Status Pills */}
            {(searchQuery || activeGenreName) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {searchQuery && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(6,182,212,0.15)',
                      border: '1px solid rgba(6,182,212,0.35)',
                      color: '#06b6d4',
                    }}
                  >
                    Search: &ldquo;{searchQuery}&rdquo;
                    <button
                      onClick={handleClearSearch}
                      className="hover:text-white ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {activeGenreName && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.35)',
                      color: '#a78bfa',
                    }}
                  >
                    Genre: {activeGenreName}
                    <button
                      onClick={() => updateUrl(1, sort, undefined, searchQuery)}
                      className="hover:text-white ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sub-header with Genre Filter & Responsive Sort Dropdown ── */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeGenreName
                ? `${activeGenreName} Movies`
                : 'All Movies'}
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {totalResults.toLocaleString()} titles available
            </p>
          </div>

          {/* Sort dropdown - Pinned on top right with 100% stable responsiveness */}
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
              <SlidersHorizontal size={14} className="sm:w-[15px] sm:h-[15px]" />
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

        {/* ── Genre Filter Pills Row ── */}
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

        {/* ── Movies Grid ── */}
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
            <p className="text-neo-text-secondary text-lg">
              No movies found matching &ldquo;{searchQuery || activeGenreName}&rdquo;.
            </p>
          </div>
        )}

        {/* ── Pagination ── */}
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
