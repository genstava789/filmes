'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Flag,
  CheckCircle2,
  RotateCcw,
  Play,
  X,
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

function formatSeconds(sec: number): string {
  const totalSeconds = Math.floor(sec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export default function VideoPlayer({ videoUrl, title, poster }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [reported, setReported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const hlsInstanceRef = useRef<any>(null);
  const lastSavedTimeRef = useRef<number>(0);

  const youtubeId = getYouTubeId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);

  const storageKey = typeof window !== 'undefined' && videoUrl
    ? `levistream_progress_${encodeURIComponent(videoUrl.split('?')[0])}`
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (youtubeId || vimeoId) return;

    let isCancelled = false;
    setHasError(false);
    setReported(false);
    setIsPlaying(false);
    setShowResumePrompt(false);
    setResumeTime(null);

    // Check for saved playback progress in localStorage
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 5) {
            setResumeTime(parsed);
            setShowResumePrompt(true);
          }
        }
      } catch (e) {
        console.error('Failed to read playback progress:', e);
      }
    }

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

        player.on('play', () => {
          setIsPlaying(true);
        });

        player.on('pause', () => {
          setIsPlaying(false);
        });

        // Track and persist playback progress
        player.on('timeupdate', () => {
          const cur = Math.floor(player.currentTime);
          const dur = Math.floor(player.duration || 0);

          if (cur > 5 && (dur === 0 || cur < dur - 10)) {
            // Save every 3 seconds
            if (Math.abs(cur - lastSavedTimeRef.current) >= 3 && storageKey) {
              lastSavedTimeRef.current = cur;
              try {
                localStorage.setItem(storageKey, String(cur));
              } catch (e) {}
            }
          }
        });

        player.on('ended', () => {
          setIsPlaying(false);
          setShowResumePrompt(false);
          if (storageKey) {
            try {
              localStorage.removeItem(storageKey);
            } catch (e) {}
          }
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
  }, [videoUrl, youtubeId, vimeoId, storageKey]);

  // Handle Resume Playback button action
  const handleResumePlayback = () => {
    if (playerInstanceRef.current && resumeTime) {
      try {
        playerInstanceRef.current.currentTime = resumeTime;
        playerInstanceRef.current.play();
      } catch (e) {
        console.error('Failed to seek player:', e);
      }
    }
    setShowResumePrompt(false);
  };

  // Handle Dismiss Resume button action (Restart from beginning)
  const handleDismissResume = () => {
    setShowResumePrompt(false);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
    }
  };

  return (
    <div
      id="video-player-section"
      className="w-full transition-all duration-500 ease-in-out relative"
    >
      {/* Ambient Backlight Glow */}
      <div className="relative group">
        <div
          className="absolute -inset-1 opacity-25 group-hover:opacity-40 transition duration-1000 blur-2xl -z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.4) 0%, rgba(124, 58, 237, 0.3) 50%, transparent 80%)',
          }}
        />

        {/* Clean Outer Player Frame */}
        <div
          className="relative rounded-none lg:rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            background: 'linear-gradient(180deg, #090e1f 0%, #050814 100%)',
            borderTop: '1px solid rgba(6, 182, 212, 0.35)',
            borderBottom: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.18)',
          }}
        >
          {/* ── 1. Floating Preview Title (Always Top-Left, Multi-line Safe) ── */}
          {title && !hasError && !isPlaying && (
            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 z-20 pointer-events-none max-w-[calc(100%-20px)] sm:max-w-[85%] md:max-w-[75%] transition-opacity duration-300 animate-in fade-in">
              <div
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md"
                style={{
                  background: 'rgba(6, 10, 26, 0.78)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(6, 182, 212, 0.15)',
                }}
              >
                <h2
                  className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-white line-clamp-2 leading-snug break-words whitespace-normal"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #06b6d4 60%, #a78bfa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.8))',
                  }}
                >
                  {title}
                </h2>
              </div>
            </div>
          )}

          {/* ── 2. Continue Watching Notification Banner in Player ── */}
          {showResumePrompt && resumeTime && !hasError && (
            <div className="absolute bottom-16 sm:bottom-20 left-3 sm:left-6 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-[90%] sm:max-w-md">
              <div
                className="flex items-center gap-3 p-2.5 sm:p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl"
                style={{
                  background: 'rgba(8, 12, 28, 0.92)',
                  borderColor: 'rgba(6, 182, 212, 0.45)',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.85), 0 0 25px rgba(6, 182, 212, 0.25)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(124, 58, 237, 0.25))',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                  }}
                >
                  <RotateCcw size={15} className="text-cyan-400 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">
                    Lanjutkan Menonton?
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tersimpan di menit <span className="font-bold text-cyan-300">{formatSeconds(resumeTime)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleResumePlayback}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                      boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    <Play size={11} fill="white" />
                    <span>Lanjut</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismissResume}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Mulai dari awal"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Video Canvas Container ── */}
          <div
            className="relative w-full overflow-hidden bg-black flex items-center justify-center plyr-custom-wrapper"
            style={{
              aspectRatio: '16/9',
              maxHeight: '800px',
            }}
          >
            {hasError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center text-slate-300 max-w-sm mx-auto animate-fadeIn">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <AlertCircle size={20} className="text-red-400" />
                </div>
                {title && (
                  <p className="text-xs font-bold text-cyan-400 mb-1 line-clamp-1 max-w-xs">
                    {title}
                  </p>
                )}
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                  Gagal Memuat Video
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed mb-3 max-w-xs">
                  Video sedang tidak dapat diputar saat ini. Server streaming mungkin sedang mengalami gangguan jaringan.
                </p>
                <button
                  type="button"
                  onClick={() => setReported(true)}
                  disabled={reported}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105"
                  style={{
                    background: reported
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    border: reported ? '1px solid rgba(34, 197, 94, 0.5)' : 'none',
                    color: reported ? '#4ade80' : 'white',
                    boxShadow: reported ? 'none' : '0 0 15px rgba(6, 182, 212, 0.4)',
                  }}
                >
                  {reported ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Laporan Terkirim</span>
                    </>
                  ) : (
                    <>
                      <Flag size={14} />
                      <span>Lapor Masalah</span>
                    </>
                  )}
                </button>
              </div>
            ) : youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title={title || 'YouTube video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
                title={title || 'Vimeo video player'}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <video
                ref={videoRef}
                className="plyr-react plyr w-full h-full"
                poster={poster}
                playsInline
                crossOrigin="anonymous"
                onError={() => setHasError(true)}
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
