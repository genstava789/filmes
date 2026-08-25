'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LogIn,
  Home,
  Film,
  Tv,
  Search,
  ChevronRight,
  Flame,
  Clapperboard,
  Star,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Genre } from '@/types/tmdb';
import siteConfig from '@/config';

interface MobileHeaderProps {
  genres?: Genre[];
}

export default function MobileHeader({ genres = [] }: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const mainNav = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/movie', icon: Film, label: 'Movies' },
    { href: '/tv', icon: Tv, label: 'TV Shows' },
    { href: '/search', icon: Search, label: 'Search' },
  ];

  const quickGenres = [
    { href: '/genre/28', icon: Flame, label: 'Action' },
    { href: '/genre/35', icon: Clapperboard, label: 'Comedy' },
    { href: '/genre/18', icon: Star, label: 'Drama' },
    { href: '/genre/27', icon: Clock, label: 'Horror' },
    { href: '/genre/878', icon: TrendingUp, label: 'Sci-Fi' },
  ];

  return (
    <header className="lg:hidden relative w-full z-40">
      {/* ── Glassmorphism Header Bar (Non-fixed) ── */}
      <div
        className="w-full h-16 px-4 sm:px-6 flex items-center justify-between transition-all duration-300"
        style={{
          background: 'rgba(11, 16, 32, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Left: Site Title (No Logo) */}
        <Link href="/" className="flex items-center group">
          <span
            className="text-lg sm:text-xl font-black tracking-wider uppercase transition-opacity duration-200 group-hover:opacity-80"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {siteConfig.nameUpper || siteConfig.name}
          </span>
        </Link>

        {/* Right: Hamburger Menu followed by Login Button */}
        <div className="flex items-center gap-2.5">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all duration-200 active:scale-95"
            style={{
              background: menuOpen ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: menuOpen
                ? '1px solid rgba(6, 182, 212, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              color: menuOpen ? '#06b6d4' : '#94a3b8',
            }}
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Login Button (No destination) */}
          <button
            type="button"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
            }}
          >
            <LogIn size={13} />
            <span>Login</span>
          </button>
        </div>
      </div>

      {/* ── Slide-Out Drawer Navigation (Consistent with Sidebar) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className="relative ml-auto w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-300"
            style={{
              background: 'rgba(11, 16, 32, 0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.08]">
              <span
                className="text-base font-black tracking-wider uppercase"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Menu Navigation
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Main Navigation */}
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Explore
                </p>
                <div className="space-y-1">
                  {mainNav.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          active
                            ? 'text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                        }`}
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(124, 58, 237, 0.15))'
                            : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={active ? 'text-cyan-400' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-500" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Movie Genres */}
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Popular Movie Genres
                </p>
                <div className="space-y-1">
                  {quickGenres.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(124, 58, 237, 0.12))'
                            : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={14} className={active ? 'text-cyan-400' : 'text-slate-500'} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight size={13} className="text-slate-600" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* All Genres Direct Link */}
              {genres.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    All Genres
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {genres.slice(0, 10).map((g) => (
                      <Link
                        key={g.id}
                        href={`/genre/${g.id}`}
                        onClick={() => setMenuOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] transition-colors truncate"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Login Action */}
            <div className="p-4 border-t border-white/[0.08]">
              <button
                type="button"
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                }}
              >
                <LogIn size={15} />
                <span>Account Login</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
