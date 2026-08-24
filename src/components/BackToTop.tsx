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
      className="fixed bottom-20 sm:bottom-24 lg:bottom-8 right-4 sm:right-6 lg:right-8 z-50 p-3 rounded-full transition-all duration-300 hover:scale-110 focus:outline-none"
      style={{
        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
        boxShadow: '0 0 20px rgba(6,182,212,0.4), 0 4px 15px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <ChevronUp size={20} className="text-white" />
    </button>
  );
}
