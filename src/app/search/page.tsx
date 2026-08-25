'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Film, Flame, TrendingUp } from 'lucide-react';
import { Movie } from '@/types/tmdb';
import { searchMovies, getTrending } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';

// Komponen internal — dibungkus Suspense di bawah agar build tidak error
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [inputValue, setInputValue] = useState(query);

  // Trending state (shown when no query)
  const [trending, setTrending] = useState<Movie[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingTab, setTrendingTab] = useState<'movie' | 'tv'>('movie');

  // Fetch trending on mount + when tab changes
  useEffect(() => {
    setTrendingLoading(true);
    getTrending(trendingTab, 'day')
      .then(data => setTrending(data.results.slice(0, 20) as Movie[]))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, [trendingTab]);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      setTotalPages(0);
      setTotalResults(0);
      return;
    }
    setLoading(true);
    try {
      const data = await searchMovies(q, p);
      setResults(data.results);
      setTotalPages(Math.min(data.total_pages, 20));
      setTotalResults(data.total_results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setInputValue(query);
    doSearch(query, 1);
  }, [query, doSearch]);

  useEffect(() => {
    if (page > 1) doSearch(query, page);
  }, [page, query, doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      {/* ── Full-width Search Header ── */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0a0e2a 0%, #100630 45%, #0a1a2e 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Decorative radial glows */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px',
            left: '20%',
            width: '400px',
            height: '400px',
            background:
              'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-40px',
            right: '15%',
            width: '300px',
            height: '300px',
            background:
              'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Header content */}
        <div className="relative max-w-3xl mx-auto px-6 py-12 text-center">
          {/* Search icon with glow */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 mx-auto"
            style={{
              background:
                'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(6,182,212,0.25)',
              boxShadow: '0 0 35px rgba(6,182,212,0.12)',
            }}
          >
            <Search size={28} style={{ color: '#06b6d4' }} />
          </div>

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl font-black mb-3 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #f1f5f9 10%, #06b6d4 55%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {query ? `"${query}"` : 'Search'}
          </h1>

          {/* Subtitle / result info */}
          <p className="text-sm mb-8 transition-all duration-300" style={{ color: '#64748b' }}>
            {query
              ? loading
                ? 'Searching...'
                : totalResults > 0
                ? `Found ${totalResults.toLocaleString()} results`
                : 'No results found'
              : 'Discover millions of movies & TV shows'}
          </p>

          {/* Full-width search form */}
          <form onSubmit={handleSearch}>
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(6,182,212,0.35)',
                boxShadow:
                  '0 0 30px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocusCapture={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.6)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 0 40px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
              }}
              onBlurCapture={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.35)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 0 30px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.05)';
              }}
            >
              <Search size={20} style={{ color: '#06b6d4', flexShrink: 0 }} />
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Search movies, TV shows..."
                className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-slate-600"
                style={{ color: '#f1f5f9' }}
                autoFocus
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-150 hover:bg-white/10"
                  style={{ color: '#475569' }}
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  color: 'white',
                  boxShadow: '0 0 18px rgba(6,182,212,0.35)',
                }}
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 py-10 pb-16">

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
              {results.map(movie => (
                <MovieCard key={movie.id} item={movie} type="movie" />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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
          </>
        )}

        {/* No results */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="p-6 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Film size={48} style={{ color: '#475569' }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>
              No results found
            </h3>
            <p className="text-center max-w-sm" style={{ color: '#64748b' }}>
              We couldn&apos;t find any movies matching &ldquo;{query}&rdquo;. Try a different search term.
            </p>
          </div>
        )}

        {/* Empty state – show trending */}
        {!loading && !query && (
          <div>
            {/* Trending header + tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(239,68,68,0.2))',
                    border: '1px solid rgba(251,146,60,0.3)',
                  }}
                >
                  <Flame size={18} style={{ color: '#fb923c' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
                    Trending Today
                  </h2>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    What everyone is watching right now
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div
                className="flex items-center sm:ml-auto gap-1 p-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(['movie', 'tv'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTrendingTab(tab)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={
                      trendingTab === tab
                        ? {
                            background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                            color: 'white',
                            boxShadow: '0 0 12px rgba(6,182,212,0.25)',
                          }
                        : { color: '#64748b' }
                    }
                  >
                    {tab === 'movie' ? (
                      <>
                        <Film size={14} />
                        Movies
                      </>
                    ) : (
                      <>
                        <TrendingUp size={14} />
                        TV Shows
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending grid */}
            {trendingLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))}
              </div>
            ) : trending.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-4">
                {trending.map(item => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    type={trendingTab === 'movie' ? 'movie' : 'tv'}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <TrendingUp size={40} style={{ color: '#475569' }} />
                <p style={{ color: '#64748b' }}>Unable to load trending content.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton saat Suspense loading (static shell)
function SearchFallback() {
  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <div
        className="w-full"
        style={{
          background: 'linear-gradient(160deg, #0a0e2a 0%, #100630 45%, #0a1a2e 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl skeleton mx-auto mb-5" />
          <div className="h-10 w-40 rounded-xl skeleton mx-auto mb-3" />
          <div className="h-4 w-64 rounded-lg skeleton mx-auto mb-8" />
          <div className="h-14 w-full rounded-2xl skeleton" />
        </div>
      </div>
    </div>
  );
}

// Default export wajib dibungkus Suspense agar Next.js 14 tidak error saat build
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
