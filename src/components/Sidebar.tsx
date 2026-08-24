'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film, Home, Tv, Search, ChevronDown, ChevronRight,
  TrendingUp, Star, Clock, Clapperboard, Flame
} from 'lucide-react';
import { Genre } from '@/types/tmdb';

interface SidebarProps {
  genres?: Genre[];
  isOpen: boolean;
  onToggle: () => void;
}

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    // Container ukuran cukup agar bars tidak terpotong saat animasi X
    <div style={{ width: '18px', height: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
      {/* Bar atas: geser dulu ke tengah (translateY), baru rotate — urutan PENTING */}
      <span
        style={{
          display: 'block',
          width: '16px',
          height: '2px',
          background: '#94a3b8',
          borderRadius: '2px',
          transformOrigin: 'center',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'none',
        }}
      />
      {/* Bar tengah: fade out */}
      <span
        style={{
          display: 'block',
          width: '16px',
          height: '2px',
          background: '#94a3b8',
          borderRadius: '2px',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          opacity: isOpen ? 0 : 1,
          transform: isOpen ? 'scaleX(0)' : 'none',
        }}
      />
      {/* Bar bawah: geser ke tengah, baru rotate berlawanan */}
      <span
        style={{
          display: 'block',
          width: '16px',
          height: '2px',
          background: '#94a3b8',
          borderRadius: '2px',
          transformOrigin: 'center',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
        }}
      />
    </div>
  );
}

export default function Sidebar({ genres = [], isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [genreExpanded, setGenreExpanded] = useState(false);

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
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{
        width: isOpen ? '240px' : '72px',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(11,16,32,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: isOpen
          ? '4px 0 30px rgba(0,0,0,0.3)'
          : '2px 0 15px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}
    >
      {/* ══════════════════════════════════════════
           HEADER
           Open    : [🎬 icon] [FILMANESIA flex:1] [✕ button]
           Collapsed: only [🎬 icon] centered
          ══════════════════════════════════════════ */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          /* padding kiri lebih besar agar logo sejajar dengan nav icon di bawah */
          padding: isOpen ? '0 8px 0 14px' : '0 8px',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: '10px',
        }}
      >
        {/* ── Logo icon (selalu tampil, link ke Home) ── */}
        <Link
          href="/"
          title="Filmanesia"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <div
            style={{
              padding: '6px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 12px rgba(6,182,212,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Film size={18} className="text-white" />
          </div>
        </Link>

        {/* ── Brand name (hanya saat open, fade+slide) ── */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.07em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            /* animasi fade+collapse saat open↔close */
            opacity: isOpen ? 1 : 0,
            maxWidth: isOpen ? '160px' : '0px',
            transition: 'opacity 0.22s ease 0.06s, max-width 0.28s ease',
            pointerEvents: 'none',
          }}
        >
          FILMANESIA
        </span>

        {/* ── Tombol X — hanya saat open, posisi KANAN judul ── */}
        {isOpen && (
          <button
            onClick={onToggle}
            title="Tutup menu"
            style={{
              flexShrink: 0,
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLElement).style.color = '#94a3b8';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#64748b';
            }}
          >
            {/* Selalu tampilkan X karena tombol ini hanya muncul saat sidebar open */}
            <HamburgerIcon isOpen={true} />
          </button>
        )}
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">

        {/* ══════════════════════════════════════════
             HAMBURGER NAV ITEM
             Hanya tampil saat collapsed.
             Styling IDENTIK dengan nav item lain (px-2 container,
             px-3 py-2.5 rounded-xl link, icon centered).
             Ini yang membuat posisi & container sejajar dengan Home dll.
            ══════════════════════════════════════════ */}
        {!isOpen && (
          <nav className="px-2 mb-1">
            <button
              onClick={onToggle}
              title="Buka menu"
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: '#64748b',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.color = '#94a3b8';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#64748b';
              }}
            >
              <HamburgerIcon isOpen={false} />
            </button>
          </nav>
        )}

        {/* Main nav label */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '32px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 0.25s ease, opacity 0.2s ease',
          }}
        >
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
            Menu
          </p>
        </div>

        <nav className="px-2 space-y-0.5 mb-4">
          {mainNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={!isOpen ? label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
                style={{
                  background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(6,182,212,0.25)' : 'transparent'}`,
                  color: active ? '#06b6d4' : '#64748b',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                  }
                }}
                onMouseLeave={e => {
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
                {/* Label with slide-in animation */}
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  style={{
                    flex: 1,
                    opacity: isOpen ? 1 : 0,
                    maxWidth: isOpen ? '160px' : '0px',
                    transition: 'opacity 0.2s ease 0.05s, max-width 0.3s ease',
                  }}
                >
                  {label}
                </span>
                {active && isOpen && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Movies section */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '32px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 0.25s ease, opacity 0.2s ease',
          }}
        >
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
            Movies
          </p>
        </div>

        <nav className="px-2 space-y-0.5 mb-4">
          {movieNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={!isOpen ? label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(6,182,212,0.25)' : 'transparent'}`,
                  color: active ? '#06b6d4' : '#64748b',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#64748b';
                  }
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  style={{
                    flex: 1,
                    opacity: isOpen ? 1 : 0,
                    maxWidth: isOpen ? '160px' : '0px',
                    transition: 'opacity 0.2s ease 0.05s, max-width 0.3s ease',
                  }}
                >
                  {label}
                </span>
                {active && isOpen && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* All Genres collapsible - only when open */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '600px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.2s ease',
          }}
        >
          <div className="px-2 mb-4">
            <button
              onClick={() => setGenreExpanded(!genreExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: '#64748b',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.color = '#94a3b8';
              }}
              onMouseLeave={e => {
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
                {genres.map(genre => {
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
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                      }}
                      onMouseLeave={e => {
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
        </div>
      </div>
    </aside>
  );
}
