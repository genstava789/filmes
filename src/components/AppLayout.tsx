'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
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

      {/* Main content */}
      <main className="app-main min-h-screen pb-20 lg:pb-0">
        {children}
      </main>

      {/* Footer */}
      <div className="app-main">
        <Footer />
      </div>
    </div>
  );
}
