import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { Cast } from '@/types/tmdb';
import { getImageUrl } from '@/lib/tmdb';

interface CastCardProps {
  cast: Cast;
}

export default function CastCard({ cast }: CastCardProps) {
  return (
    <div
      className="flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl min-w-[120px] sm:min-w-[140px] max-w-[130px] sm:max-w-[150px] transition-all duration-200 hover:scale-105 active:scale-95 group flex-shrink-0"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      {/* Avatar (Large, clear squircle shape) */}
      <div
        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mb-2.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{
          border: '1.5px solid rgba(6, 182, 212, 0.35)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
        }}
      >
        {cast.profile_path ? (
          <Image
            src={getImageUrl(cast.profile_path, 'w200')}
            alt={cast.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80px, 96px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <User size={32} className="text-slate-500" />
          </div>
        )}
      </div>

      {/* Name & Character */}
      <div className="w-full">
        <p className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-cyan-300 transition-colors">
          {cast.name}
        </p>
        <p className="text-[11px] sm:text-xs text-slate-400 leading-tight mt-1 line-clamp-1">
          {cast.character || 'Cast'}
        </p>
      </div>
    </div>
  );
}
