'use client';

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-16 pt-6 pb-24 sm:pb-28 lg:pb-8"
      style={{
        background: 'linear-gradient(to bottom, transparent, #080c1b)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-neo-text-muted text-xs">
            © {currentYear} <span className="font-semibold text-slate-300">Filmanesia</span>. All rights reserved.
          </p>
          <p className="text-neo-text-muted text-xs">
            Powered by{' '}
            <span className="text-neo-cyan font-medium">Next.js</span> &{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-violet hover:text-neo-cyan transition-colors font-medium"
            >
              TMDB API
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
