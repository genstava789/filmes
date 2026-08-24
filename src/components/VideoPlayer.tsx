'use client';

import React, { useState, useRef } from 'react';
import { Play, Maximize2, Minimize2, Tv, Sparkles, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  poster?: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1`;
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  return (
    /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(url) ||
    url.includes('commondatastorage.googleapis.com') ||
    url.startsWith('blob:') ||
    url.startsWith('data:video')
  );
}

export default function VideoPlayer({ videoUrl, title, poster }: VideoPlayerProps) {
  const [isTheater, setIsTheater] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoUrl);
  const directVideo = isDirectVideo(videoUrl);

  const toggleTheater = () => {
    setIsTheater((prev) => !prev);
  };

  return (
    <div
      id="video-player-section"
      className={`w-full transition-all duration-500 ease-in-out ${
        isTheater ? 'max-w-full px-2 sm:px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      }`}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #080c1e 100%)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          boxShadow: '0 0 50px rgba(6, 182, 212, 0.15), 0 20px 50px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Player Header Bar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.08)',
            background: 'rgba(5, 8, 22, 0.85)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
              }}
            >
              <Play size={15} fill="white" className="text-white ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#06b6d4',
                  }}
                >
                  Stream Player
                </span>
                <span className="text-xs text-neo-text-muted hidden sm:inline-flex items-center gap-1">
                  <Sparkles size={11} className="text-neo-cyan" /> 4K Ultra HD
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md md:max-w-lg mt-0.5">
                {title ? `Now Watching: ${title}` : 'Video Stream'}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheater}
              title={isTheater ? 'Default View' : 'Theater Mode'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: isTheater ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                border: isTheater
                  ? '1px solid rgba(6, 182, 212, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
                color: isTheater ? '#06b6d4' : '#94a3b8',
              }}
            >
              {isTheater ? (
                <>
                  <Minimize2 size={14} />
                  <span className="hidden sm:inline">Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 size={14} />
                  <span className="hidden sm:inline">Theater Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div
          className="relative w-full overflow-hidden bg-black flex items-center justify-center"
          style={{
            aspectRatio: '16/9',
            maxHeight: isTheater ? '85vh' : '700px',
          }}
        >
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-neo-text-secondary">
              <AlertCircle size={40} className="text-red-400 mb-2" />
              <p className="font-semibold text-white">Gagal memuat video</p>
              <p className="text-xs mt-1 text-neo-text-muted">
                URL video tidak dapat diakses atau format tidak didukung: {videoUrl}
              </p>
            </div>
          ) : youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={title || 'Movie Video Player'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : directVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              onError={() => setHasError(true)}
              className="w-full h-full object-contain"
            >
              Browser Anda tidak mendukung tag video HTML5.
            </video>
          ) : (
            // Generic iframe fallback for other stream embed providers
            <iframe
              src={videoUrl}
              title={title || 'Movie Stream'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onError={() => setHasError(true)}
            />
          )}
        </div>

        {/* Player Bottom Info Bar */}
        <div
          className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 text-xs border-t"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.05)',
            background: 'rgba(5, 8, 22, 0.7)',
            color: '#64748b',
          }}
        >
          <div className="flex items-center gap-2">
            <Tv size={13} className="text-neo-purple" />
            <span>Fast CDN Streaming Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Sound: Stereo / Dolby 5.1</span>
            <span className="text-neo-cyan font-medium">Custom Page Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
