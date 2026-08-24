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

function isDirectVideo(url: string): boolean {
  return (
    /\.(mp4|webm|ogg|mov|m4v|m3u8|mkv)(\?.*)?$/i.test(url) ||
    url.includes('commondatastorage.googleapis.com') ||
    url.includes('huggingface.co') ||
    url.includes('/resolve/') ||
    url.includes('/raw/') ||
    url.startsWith('blob:') ||
    url.startsWith('data:video')
  );
}

export default function VideoPlayer({ videoUrl, title, poster }: VideoPlayerProps) {
  const [isTheater, setIsTheater] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasError, setHasError] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const hlsInstanceRef = useRef<any>(null);

  const youtubeId = getYouTubeId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);
  const directVideo = isDirectVideo(videoUrl);

  const toggleTheater = () => {
    setIsTheater((prev) => !prev);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = playerContainerRef.current;
    if (!container) return;

    let isCancelled = false;
    setHasError(false);
    container.innerHTML = '';

    // If YouTube embed
    if (youtubeId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`;
      iframe.title = title || 'Movie Video Player';
      iframe.className = 'w-full h-full border-0';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);

      return () => {
        container.innerHTML = '';
      };
    }

    // If Vimeo embed
    if (vimeoId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${vimeoId}`;
      iframe.title = title || 'Movie Video Player';
      iframe.className = 'w-full h-full border-0';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);

      return () => {
        container.innerHTML = '';
      };
    }

    // If Direct Video Stream (MP4, MKV, M3U8, HuggingFace, etc.)
    if (directVideo) {
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      if (poster) videoElement.poster = poster;
      videoElement.playsInline = true;
      videoElement.crossOrigin = 'anonymous';
      videoElement.preload = 'metadata';
      videoElement.className = 'w-full h-full object-contain';
      videoElement.onerror = () => {
        if (!isCancelled) setHasError(true);
      };
      container.appendChild(videoElement);

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
              'restart',
              'rewind',
              'play',
              'fast-forward',
              'progress',
              'current-time',
              'duration',
              'mute',
              'volume',
              'captions',
              'settings',
              'pip',
              'airplay',
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
        container.innerHTML = '';
      };
    }

    // Generic Stream Iframe Fallback
    const iframe = document.createElement('iframe');
    iframe.src = videoUrl;
    iframe.title = title || 'Movie Stream';
    iframe.className = 'w-full h-full border-0';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    iframe.allowFullscreen = true;
    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [videoUrl, title, poster, youtubeId, vimeoId, directVideo]);

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
              className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
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
                  Modern Stream Player
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Keyboard shortcuts toggle */}
            <button
              onClick={() => setShowShortcuts((prev) => !prev)}
              title="Keyboard Shortcuts"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: showShortcuts ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                border: showShortcuts
                  ? '1px solid rgba(124, 58, 237, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
                color: showShortcuts ? '#a78bfa' : '#94a3b8',
              }}
            >
              <Keyboard size={14} />
              <span>Keys</span>
            </button>

            {/* Theater Mode toggle */}
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
                  <span className="hidden sm:inline">Theater</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Shortcuts info banner */}
        {showShortcuts && (
          <div
            className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs border-b gap-2"
            style={{
              background: 'rgba(12, 18, 36, 0.95)',
              borderColor: 'rgba(124, 58, 237, 0.3)',
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

        {/* Video Canvas Container */}
        <div
          className="relative w-full overflow-hidden bg-black flex items-center justify-center plyr-custom-wrapper"
          style={{
            aspectRatio: '16/9',
            maxHeight: isTheater ? '85vh' : '700px',
          }}
        >
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-neo-text-secondary">
              <AlertCircle size={40} className="text-red-400 mb-2" />
              <p className="font-semibold text-white">Gagal memuat video</p>
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
                Buka / Download Sumber Langsung
              </a>
            </div>
          ) : (
            <div ref={playerContainerRef} className="w-full h-full flex items-center justify-center" />
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
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-neo-text-muted hover:text-neo-cyan transition-colors"
            >
              <ExternalLink size={12} />
              <span>Direct Link</span>
            </a>
            <span className="text-neo-cyan font-medium">Custom Page Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
