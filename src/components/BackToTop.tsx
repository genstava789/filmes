'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-24 lg:bottom-8 right-4 sm:right-6 lg:right-8 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 focus:outline-none shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.45), 0 4px 15px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <ChevronUp size={20} className="text-white drop-shadow" />
    </button>
  );
}
