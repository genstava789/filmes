'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { Movie } from '@/types/tmdb';
import { searchMovies } from '@/lib/tmdb';
import MovieCard, { MovieCardSkeleton } from '@/components/MovieCard';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [inputValue, setInputValue] = useState(query);

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
    <div className="min-h-screen pt-8 pb-16" style={{ background: '#050816' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-neo-text-primary mb-6">
            {query ? (
              <>
                Results for{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  &ldquo;{query}&rdquo;
                </span>
              </>
            ) : (
              'Search Movies'
            )}
          </h1>

          {/* Search form */}
          <form onSubmit={handleSearch} className="max-w-xl">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(6,182,212,0.3)',
                boxShadow: '0 0 20px rgba(6,182,212,0.1)',
              }}
            >
              <Search size={20} className="text-neo-cyan flex-shrink-0" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search for movies..."
                className="flex-1 bg-transparent text-neo-text-primary placeholder-neo-text-muted text-base focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  color: 'white',
                }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Result count */}
          {query && !loading && totalResults > 0 && (
            <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>
              Found{' '}
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>
                {totalResults.toLocaleString()}
              </span>{' '}
              results
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((movie) => (
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
          </>
        )}

        {/* No results */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="p-6 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Film size={48} className="text-neo-text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-neo-text-primary">No results found</h3>
            <p className="text-neo-text-secondary text-center max-w-sm">
              We couldn&apos;t find any movies matching &ldquo;{query}&rdquo;. Try a different search term.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !query && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="p-6 rounded-full"
              style={{ background: 'rgba(6,182,212,0.08)' }}
            >
              <Search size={48} className="text-neo-cyan" />
            </div>
            <h3 className="text-xl font-semibold text-neo-text-primary">Search for movies</h3>
            <p className="text-neo-text-secondary text-center max-w-sm">
              Type a movie title in the search box above to find movies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
