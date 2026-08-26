'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Film,
  Flame,
  Tv,
  X,
  Sparkles,
} from 'lucide-react';
import { Movie, TVShow } from '@/types/tmdb';
import { searchMovies, searchTVShows, getTrending } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as 'movie' | 'tv') || 'movie';

  const [searchType, setSearchType] = useState<'movie' | 'tv'>(typeParam);
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [inputValue, setInputValue] = useState(query);

  // Trending state (shown when no query)
  const [trending, setTrending] = useState<(Movie | TVShow)[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingTab, setTrendingTab] = useState<'movie' | 'tv'>('movie');

  // Fetch trending content on mount + when trending tab changes
  useEffect(() => {
    if (!query) {
      setTrendingLoading(true);
      getTrending(trendingTab, 'day')
        .then((data) => setTrending(data.results.slice(0, 20) as (Movie | TVShow)[]))
        .catch(() => setTrending([]))
        .finally(() => setTrendingLoading(false));
    }
  }, [trendingTab, query]);

  // Search function for Movies or TV Shows
  const doSearch = useCallback(
    async (q: string, p: number, type: 'movie' | 'tv') => {
      if (!q.trim()) {
        setResults([]);
        setTotalPages(0);
        setTotalResults(0);
        return;
      }
      setLoading(true);
      try {
        const data =
          type === 'movie'
            ? await searchMovies(q, p)
            : await searchTVShows(q, p);
        setResults(data.results);
        setTotalPages(Math.min(data.total_pages, 20));
        setTotalResults(data.total_results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger search on query / typeParam change
  useEffect(() => {
    setPage(1);
    setInputValue(query);
    setSearchType(typeParam);
    doSearch(query, 1, typeParam);
  }, [query, typeParam, doSearch]);

  // Page pagination change
  useEffect(() => {
    if (page > 1) {
      doSearch(query, page, searchType);
    }
  }, [page, query, searchType, doSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(
        `/search?q=${encodeURIComponent(inputValue.trim())}&type=${searchType}`,
        { scroll: false }
      );
    }
  };

  const handleTypeSwitch = (newType: 'movie' | 'tv') => {
    setSearchType(newType);
    if (query.trim()) {
      router.push(
        `/search?q=${encodeURIComponent(query.trim())}&type=${newType}`,
        { scroll: false }
      );
    }
  };

  const handleClear = () => {
    setInputValue('');
    router.push('/search', { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* ── Search Hero Header ── */}
      <div
        className="w-full relative overflow-hidden pt-10 pb-8 sm:py-12"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.2) 0%, rgba(6, 182, 212, 0.1) 45%, #050816 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(124,58,237,0.18))',
              border: '1px solid rgba(6,182,212,0.35)',
              color: '#06b6d4',
            }}
          >
            <Sparkles size={12} />
            <span>Search Explorer</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
            <span
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #a78bfa 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {query ? `"${query}"` : 'Search Movies & Series'}
            </span>
          </h1>

          {/* Subtitle / Results count */}
          <p className="text-xs sm:text-sm text-slate-400 mb-6 font-medium">
            {query
              ? loading
                ? 'Searching database...'
                : totalResults > 0
                ? `Found ${totalResults.toLocaleString()} ${searchType === 'movie' ? 'movies' : 'series'} matching your search`
                : 'No results found'
              : 'Find your favorite movies, series, and cast members'}
          </p>

          {/* ── Search Input Bar (Bug-Free, 100% Inside Container on all Mobile Devices) ── */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl mx-auto mb-4">
            <div
              className="flex items-center p-1.5 sm:p-2 pl-3.5 sm:pl-4 rounded-2xl w-full transition-all duration-300 focus-within:border-cyan-500/60 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
              style={{
                background: 'rgba(9, 13, 30, 0.85)',
                border: '1.5px solid rgba(6, 182, 212, 0.35)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <Search size={18} className="text-cyan-400 flex-shrink-0 mr-2" />

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type movie or series title..."
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none pr-2 font-medium"
                autoFocus
              />

              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 mr-1 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  boxShadow: '0 0 14px rgba(6,182,212,0.35)',
                }}
              >
                <Search size={14} className="hidden xs:inline" />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* ── Compact Segmented Movie / TV Tab Switcher (Snug Fit Width) ── */}
          <div className="flex justify-center items-center">
            <div
              className="inline-flex items-center gap-1 p-1 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => handleTypeSwitch('movie')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={
                  searchType === 'movie'
                    ? {
                        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                        color: 'white',
                        boxShadow: '0 0 12px rgba(6,182,212,0.3)',
                      }
                    : { color: '#94a3b8' }
                }
              >
                <Film size={13} />
                <span>Movies</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeSwitch('tv')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={
                  searchType === 'tv'
                    ? {
                        background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                        color: 'white',
                        boxShadow: '0 0 12px rgba(236,72,153,0.3)',
                      }
                    : { color: '#94a3b8' }
                }
              >
                <Tv size={13} />
                <span>TV Shows</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Section ── */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-6 sm:pt-8 pb-4 sm:pb-6">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5 md:gap-5">
            {Array.from({ length: 14 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5 md:gap-5">
              {results.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  type={searchType}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 sm:mt-10 mb-2">
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
                  if (totalPages <= 7) pageNum = i + 1;
                  else if (page <= 4) pageNum = i + 1;
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                  else pageNum = page - 3 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className="w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                      style={
                        page === pageNum
                          ? {
                              background:
                                searchType === 'tv'
                                  ? 'linear-gradient(135deg, #ec4899, #7c3aed)'
                                  : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                              color: 'white',
                              boxShadow:
                                searchType === 'tv'
                                  ? '0 0 15px rgba(236,72,153,0.3)'
                                  : '0 0 15px rgba(6,182,212,0.3)',
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
          </>
        )}

        {/* No Results Empty State */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="p-6 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Film size={48} style={{ color: '#475569' }} />
            </div>
            <h3 className="text-xl font-bold text-white">No results found</h3>
            <p className="text-center text-sm max-w-sm text-slate-400">
              We couldn&apos;t find any {searchType === 'movie' ? 'movies' : 'series'} matching &ldquo;{query}&rdquo;. Try another title or switch category.
            </p>
          </div>
        )}

        {/* Empty State – Show Trending */}
        {!loading && !query && (
          <div>
            {/* Trending Header with Compact Segmented Tabs */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(239,68,68,0.2))',
                    border: '1px solid rgba(251,146,60,0.3)',
                  }}
                >
                  <Flame size={16} style={{ color: '#fb923c' }} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Trending Today</h2>
                  <p className="text-[11px] text-slate-400 hidden xs:block">
                    What everyone is watching right now
                  </p>
                </div>
              </div>

              {/* Compact Trending Tab Switcher */}
              <div
                className="inline-flex items-center gap-1 p-1 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTrendingTab('movie')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                  style={
                    trendingTab === 'movie'
                      ? {
                          background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 0 10px rgba(6,182,212,0.25)',
                        }
                      : { color: '#94a3b8' }
                  }
                >
                  <Film size={12} />
                  <span>Movies</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrendingTab('tv')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                  style={
                    trendingTab === 'tv'
                      ? {
                          background: 'linear-gradient(135deg, #ec4899, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 0 10px rgba(236,72,153,0.25)',
                        }
                      : { color: '#94a3b8' }
                  }
                >
                  <Tv size={12} />
                  <span>TV Shows</span>
                </button>
              </div>
            </div>

            {/* Trending Grid */}
            {trendingLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))}
              </div>
            ) : trending.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {trending.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    type={trendingTab}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Film size={40} style={{ color: '#475569' }} />
                <p className="text-slate-400 text-sm">Unable to load trending content.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <div
        className="w-full pt-10 pb-8 sm:py-12"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.2) 0%, rgba(6, 182, 212, 0.1) 45%, #050816 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto mb-4 animate-pulse" />
          <div className="h-8 w-48 bg-white/5 rounded-xl mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-full bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
