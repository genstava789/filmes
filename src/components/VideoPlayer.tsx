'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Maximize2,
  Minimize2,
  Tv,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Keyboard,
} from 'lucide-react';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  poster?: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match && match[1] ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/)(\d+)/);
  return match && match[1] ? match[1] : null;
}

export default function VideoPlayer({ videoUrl, title, poster }: VideoPlayerProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasError, setHasError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const hlsInstanceRef = useRef<any>(null);

  const youtubeId = getYouTubeId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (youtubeId || vimeoId) return;

    let isCancelled = false;
    setHasError(false);

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const initModules = async () => {
      const isHls = videoUrl.includes('.m3u8');
      try {
        if (isHls) {
          const HlsModule = (await import('hls.js')).default;
          if (HlsModule.isSupported() && !isCancelled) {
            const hls = new HlsModule({
              enableWorker: true,
              lowLatencyMode: true,
            });
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            hlsInstanceRef.current = hls;
          }
        }

        const PlyrModule = (await import('plyr')).default;
        if (isCancelled) return;

        const player = new PlyrModule(videoElement, {
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'fullscreen',
          ],
          settings: ['speed', 'quality', 'loop'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          seekTime: 10,
          keyboard: { focused: true, global: true },
          tooltips: { controls: true, seek: true },
          fullscreen: { enabled: true, fallback: true, iosNative: true },
        });

        playerInstanceRef.current = player;
      } catch (err) {
        console.error('Error loading video player modules:', err);
      }
    };

    initModules();

    return () => {
      isCancelled = true;
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) {}
        playerInstanceRef.current = null;
      }
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.destroy();
        } catch (e) {}
        hlsInstanceRef.current = null;
      }
    };
  }, [videoUrl, youtubeId, vimeoId]);

  return (
    <div
      id="video-player-section"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out"
    >
      {/* Netflix Ambient Backlight Glow */}
      <div className="relative group">
        <div
          className="absolute -inset-1 rounded-3xl opacity-30 group-hover:opacity-45 transition duration-1000 blur-2xl -z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.4) 0%, rgba(124, 58, 237, 0.3) 50%, transparent 80%)',
          }}
        />

        {/* Outer Player Frame */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(180deg, #090e1f 0%, #050814 100%)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.18)',
          }}
        >
          {/* Netflix Style Streaming Header Bar (without top fullscreen button) */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.08)',
              background: 'rgba(7, 11, 26, 0.9)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  boxShadow: '0 0 15px rgba(6, 182, 212, 0.45)',
                }}
              >
                <Play size={15} fill="white" className="text-white ml-0.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1.5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(124, 58, 237, 0.25))',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      color: '#38bdf8',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Now Streaming
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-neo-text-primary hidden sm:inline-flex items-center gap-1">
                    <Sparkles size={11} className="text-neo-cyan" /> 4K Ultra HD
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-xl mt-0.5 tracking-wide">
                  {title || 'Video Player'}
                </h3>
              </div>
            </div>

            {/* Action buttons (Shortcuts toggle only) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowShortcuts((prev) => !prev)}
                title="Keyboard Shortcuts"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: showShortcuts ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: showShortcuts
                    ? '1px solid rgba(124, 58, 237, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  color: showShortcuts ? '#c4b5fd' : '#94a3b8',
                }}
              >
                <Keyboard size={14} />
                <span>Keys</span>
              </button>
            </div>
          </div>

          {/* Shortcuts info banner */}
          {showShortcuts && (
            <div
              className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs border-b gap-2 animate-fadeIn"
              style={{
                background: 'rgba(12, 18, 36, 0.98)',
                borderColor: 'rgba(124, 58, 237, 0.35)',
                color: '#94a3b8',
              }}
            >
              <div className="flex flex-wrap items-center gap-4">
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">Space</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">K</kbd> Play/Pause</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">←</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">→</kbd> Seek 10s</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">↓</kbd> Volume</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">F</kbd> Fullscreen</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-neo-cyan">M</kbd> Mute</span>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-xs text-neo-text-muted hover:text-white"
              >
                ✕ Tutup
              </button>
            </div>
          )}

          {/* Video Canvas Container (Direct Video Tag Rendered in JSX) */}
          <div
            className="relative w-full overflow-hidden bg-black flex items-center justify-center plyr-custom-wrapper"
            style={{
              aspectRatio: '16/9',
              maxHeight: '720px',
            }}
          >
            {hasError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-neo-text-secondary">
                <AlertCircle size={40} className="text-red-400 mb-2" />
                <p className="font-semibold text-white">Gagal memuat video stream</p>
                <p className="text-xs mt-1 text-neo-text-muted max-w-md">
                  URL video tidak dapat diakses atau dibatasi oleh CORS server: {videoUrl}
                </p>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    color: 'white',
                  }}
                >
                  <ExternalLink size={14} />
                  Buka Sumber Video Langsung
                </a>
              </div>
            ) : youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title={title || 'Stream Video Player'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}`}
                title={title || 'Stream Video Player'}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div key={videoUrl} className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={poster}
                  playsInline
                  crossOrigin="anonymous"
                  preload="metadata"
                  controls
                  onError={() => setHasError(true)}
                  className="w-full h-full object-contain"
                >
                  <source
                    src={videoUrl}
                    type={videoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>

          {/* Player Bottom Info Ribbon */}
          <div
            className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 text-xs border-t"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.05)',
              background: 'rgba(6, 9, 24, 0.85)',
              color: '#64748b',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-neo-cyan">
                <Tv size={13} />
                <span className="font-semibold">HTML5 Stream Engine</span>
              </div>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-400">Direct Video Injected</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-neo-text-muted hover:text-neo-cyan transition-colors font-medium"
              >
                <ExternalLink size={12} />
                <span>Source Link</span>
              </a>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase">
                Ultra HD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
