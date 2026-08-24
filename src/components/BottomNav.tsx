'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Tv, Search, Grid3X3, X, ChevronRight } from 'lucide-react';
import { Genre } from '@/types/tmdb';

interface BottomNavProps {
  genres?: Genre[];
}

export default function BottomNav({ genres = [] }: BottomNavProps) {
  const pathname = usePathname();
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/genre/28', icon: Film, label: 'Movies' },
    { href: '/tv', icon: Tv, label: 'TV Shows' },
    { href: '/search', icon: Search, label: 'Search' },
    { icon: Grid3X3, label: 'Genres', action: () => setGenreSheetOpen(true) },
  ];

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(11, 16, 32, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.5)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = item.href ? isActive(item.href) : false;
            const Icon = item.icon;

            const content = (
              <div
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[58px] ${
                  active
                    ? 'text-cyan-400 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.25)]'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] hover:border-white/10 border border-transparent'
                }`}
                style={{
                  background: active
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))'
                    : 'transparent',
                }}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    size={20}
                    className={active ? 'drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : ''}
                    style={{
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-wide transition-colors duration-200 ${
                    active ? 'font-bold text-cyan-400' : 'font-medium text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className="focus:outline-none transition-transform active:scale-95"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Genre Bottom Sheet */}
      {genreSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setGenreSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl overflow-hidden"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              maxHeight: '70vh',
              paddingBottom: 'env(safe-area-inset-bottom)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-bold text-base" style={{ color: '#f1f5f9' }}>Browse Genres</h3>
              <button
                onClick={() => setGenreSheetOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            </div>
            {/* Genre Grid */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(70vh - 80px)' }}>
              <div className="grid grid-cols-2 gap-2">
                {genres.map((genre) => {
                  const isGenreActive = pathname === `/genre/${genre.id}`;
                  return (
                    <Link
                      key={genre.id}
                      href={`/genre/${genre.id}`}
                      onClick={() => setGenreSheetOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                        isGenreActive
                          ? 'text-cyan-400 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.25)]'
                          : 'text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] hover:border-white/10 border border-white/[0.06]'
                      }`}
                      style={{
                        background: isGenreActive
                          ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.2))'
                          : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <span className="text-sm font-medium">{genre.name}</span>
                      <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
