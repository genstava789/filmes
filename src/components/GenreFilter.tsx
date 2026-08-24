'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Genre } from '@/types/tmdb';

interface GenreFilterProps {
  genres: Genre[];
  activeGenreId?: number;
}

export default function GenreFilter({ genres, activeGenreId }: GenreFilterProps) {
  const router = useRouter();

  const handleGenreClick = (genreId: number) => {
    router.push(`/genre/${genreId}`);
  };

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
      <button
        onClick={() => router.push('/')}
        className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
        style={
          !activeGenreId
            ? {
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                color: 'white',
                boxShadow: '0 0 15px rgba(6,182,212,0.3)',
              }
            : {
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
              }
        }
      >
        All
      </button>
      {genres.map((genre) => {
        const isActive = activeGenreId === genre.id;
        return (
          <button
            key={genre.id}
            onClick={() => handleGenreClick(genre.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    color: 'white',
                    boxShadow: '0 0 15px rgba(6,182,212,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }
            }
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
