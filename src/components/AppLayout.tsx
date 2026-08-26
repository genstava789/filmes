'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import Footer from './Footer';
import { Genre } from '@/types/tmdb';

interface AppLayoutProps {
  children: React.ReactNode;
  genres: Genre[];
}

export default function AppLayout({ children, genres }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      data-sidebar={sidebarOpen ? 'open' : 'closed'}
      className="relative w-full max-w-full overflow-x-clip overflow-x-hidden min-h-screen"
    >
      {/* Desktop Sidebar */}
      <Sidebar
        genres={genres}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />

      {/* Mobile Bottom Nav */}
      <BottomNav genres={genres} />

      {/* Main Content & Mobile Header */}
      <div className="app-main flex flex-col min-h-screen w-full max-w-full overflow-x-clip overflow-x-hidden">
        {/* Mobile Header (Non-fixed, glassmorphism) */}
        <MobileHeader genres={genres} />

        <main className="flex-1 w-full max-w-full overflow-x-clip overflow-x-hidden">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
