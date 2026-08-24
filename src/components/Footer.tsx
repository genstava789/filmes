'use client';

import React from 'react';
import siteConfig from '@/config';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-neo-text-muted text-xs text-center">
          © {currentYear} <span className="font-semibold text-slate-300">{siteConfig.copyright || siteConfig.name}</span>. {siteConfig.footerText}
        </p>
      </div>
    </footer>
  );
}
