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
    <div data-sidebar={sidebarOpen ? 'open' : 'closed'}>
      {/* Desktop Sidebar */}
      <Sidebar
        genres={genres}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />

      {/* Mobile Bottom Nav */}
      <BottomNav genres={genres} />

      {/* Main Content & Mobile Header */}
      <div className="app-main flex flex-col min-h-screen">
        {/* Mobile Header (Non-fixed, glassmorphism) */}
        <MobileHeader genres={genres} />

        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
