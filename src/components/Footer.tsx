'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Github, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-20 pt-12 pb-8"
      style={{
        background: 'linear-gradient(to bottom, transparent, #0B1020)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}
              >
                <Film size={20} className="text-white" />
              </div>
              <span
                className="text-2xl font-black tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                FILMANESIA
              </span>
            </Link>
            <p className="text-neo-text-secondary text-sm leading-relaxed max-w-xs">
              Your ultimate destination for discovering movies and TV shows. Explore trending titles,
              top-rated classics, and everything in between.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3 mt-5">
              {[
                { icon: <Github size={18} />, label: 'GitHub', href: '#' },
                { icon: <Twitter size={18} />, label: 'Twitter', href: '#' },
                { icon: <Instagram size={18} />, label: 'Instagram', href: '#' },
                { icon: <Youtube size={18} />, label: 'YouTube', href: '#' },
              ].map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.5)';
                    (e.currentTarget as HTMLElement).style.color = '#06b6d4';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(6,182,212,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-neo-text-primary font-semibold mb-4 text-sm uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Movies', href: '/genre/28' },
                { label: 'TV Shows', href: '/tv' },
                { label: 'Search', href: '/search' },
                { label: 'Top Rated', href: '/genre/18' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-neo-text-secondary text-sm hover:text-neo-cyan transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-neo-text-primary font-semibold mb-4 text-sm uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '#' },
                { label: 'Contact', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
                { label: 'Cookie Policy', href: '#' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-neo-text-secondary text-sm hover:text-neo-cyan transition-colors duration-200"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* TMDB Attribution */}
        <div
          className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="flex-shrink-0 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #01b4e4, #0d253f)',
              color: 'white',
            }}
          >
            TMDB
          </div>
          <p className="text-neo-text-muted text-xs leading-relaxed">
            This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV
            show data, images, and metadata are provided by{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline"
            >
              The Movie Database (TMDB)
            </a>
            .
          </p>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-neo-text-muted text-xs">
            © {currentYear} Filmanesia. All rights reserved.
          </p>
          <p className="text-neo-text-muted text-xs">
            Built with{' '}
            <span className="text-neo-cyan">Next.js 14</span> &{' '}
            <span className="text-neo-violet">TMDB API</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
