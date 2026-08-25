'use client';

import React from 'react';
import siteConfig from '@/config';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-4 sm:mt-6 pt-4 pb-20 sm:pb-24 lg:pb-6"
      style={{
        background: 'linear-gradient(to bottom, transparent, #080c1b)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 text-center">
        <p className="text-neo-text-muted text-xs text-center">
          © {currentYear} <span className="font-semibold text-slate-300">{siteConfig.copyright || siteConfig.name}</span>. {siteConfig.footerText}
        </p>
      </div>
    </footer>
  );
}
