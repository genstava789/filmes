'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film, Home, Tv, Search, ChevronDown, ChevronRight,
  TrendingUp, Star, Clock, Clapperboard, Flame
} from 'lucide-react';
import SearchBar from './SearchBar';
import { Genre } from '@/types/tmdb';

interface SidebarProps {
  genres?: Genre[];
}

export default function Sidebar({ genres = [] }: SidebarProps) {
  const pathname = usePathname();
  const [genreExpanded, setGenreExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const mainNav = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/tv', icon: Tv, label: 'TV Shows' },
  ];

  const movieNav = [
    { href: '/genre/28', icon: Flame, label: 'Action' },
    { href: '/genre/35', icon: Clapperboard, label: 'Comedy' },
    { href: '/genre/18', icon: Star, label: 'Drama' },
    { href: '/genre/27', icon: Clock, label: 'Horror' },
    { href: '/genre/878', icon: TrendingUp, label: 'Sci-Fi' },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300"
      style={{
        width: collapsed ? '72px' : '240px',
        background: 'rgba(11,16,32,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: '72px' }}
      >
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex-shrink-0 p-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 16px rgba(6,182,212,0.4)',
            }}
          >
            <Film size={20} className="text-white" />
          </div>
          {!collapsed && (
            <span
              className="text-lg font-black tracking-wider whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              FILMANESIA
            </span>
          )}
        </Link>
      </div>

      {/* Search - only when expanded */}
      {!collapsed && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <SearchBar compact />
        </div>
      )}

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto py-3 hide-scrollbar">
        {/* Main nav */}
        {!collapsed && (
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
            Menu
          </p>
        )}
        <nav className="px-2 space-y-0.5 mb-4">
          {mainNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
                style={{
                  background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(6,182,212,0.25)' : 'transparent'}`,
                  color: active ? '#06b6d4' : '#64748b',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#64748b';
                  }
                }}
              >
                <Icon
                  size={18}
                  style={{
                    flexShrink: 0,
                    filter: active ? 'drop-shadow(0 0 6px rgba(6,182,212,0.7))' : 'none',
                  }}
                />
                {!collapsed && (
                  <span className="text-sm font-medium">{label}</span>
                )}
                {active && !collapsed && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Movies section */}
        {!collapsed && (
          <>
            <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
              Movies
            </p>
            <nav className="px-2 space-y-0.5 mb-4">
              {movieNav.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(6,182,212,0.25)' : 'transparent'}`,
                      color: active ? '#06b6d4' : '#64748b',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#64748b';
                      }
                    }}
                  >
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    <span className="text-sm font-medium">{label}</span>
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* All Genres collapsible */}
            <div className="px-2 mb-4">
              <button
                onClick={() => setGenreExpanded(!genreExpanded)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: '#64748b',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#64748b';
                }}
              >
                <Film size={18} style={{ flexShrink: 0 }} />
                <span className="text-sm font-medium flex-1 text-left">All Genres</span>
                {genreExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {genreExpanded && (
                <div
                  className="mt-1 ml-2 pl-4 space-y-0.5"
                  style={{ borderLeft: '1px solid rgba(6,182,212,0.2)' }}
                >
                  {genres.map((genre) => {
                    const active = pathname === `/genre/${genre.id}`;
                    return (
                      <Link
                        key={genre.id}
                        href={`/genre/${genre.id}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 text-sm"
                        style={{
                          color: active ? '#06b6d4' : '#64748b',
                          background: active ? 'rgba(6,182,212,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.color = '#64748b';
                        }}
                      >
                        {genre.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collapse toggle button */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            size={18}
            style={{
              flexShrink: 0,
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease',
            }}
          />
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
