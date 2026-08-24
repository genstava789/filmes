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
    <div className="flex flex-col items-center gap-2 min-w-[100px] max-w-[100px]">
      <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
        style={{ border: '2px solid rgba(6,182,212,0.3)' }}>
        {cast.profile_path ? (
          <Image
            src={getImageUrl(cast.profile_path, 'w200')}
            alt={cast.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <User size={28} className="text-neo-text-muted" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-neo-text-primary text-xs font-semibold leading-tight line-clamp-2">
          {cast.name}
        </p>
        <p className="text-neo-text-muted text-xs leading-tight mt-0.5 line-clamp-2">
          {cast.character}
        </p>
      </div>
    </div>
  );
}
