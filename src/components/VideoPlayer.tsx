'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Flag,
  Tv,
  CheckCircle2,
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

export default function VideoPlayer({ videoUrl, poster }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [reported, setReported] = useState(false);
  const [resolution, setResolution] = useState<string>('1080p FHD');

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
    setReported(false);

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

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.videoHeight >= 2160) setResolution('4K UHD');
    else if (v.videoHeight >= 1440) setResolution('2K QHD');
    else if (v.videoHeight >= 1080) setResolution('1080p FHD');
    else if (v.videoHeight >= 720) setResolution('720p HD');
    else if (v.videoHeight >= 480) setResolution('480p SD');
  };

  return (
    <div
      id="video-player-section"
      className="w-full transition-all duration-500 ease-in-out"
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
          {/* Video Canvas Container (Direct Video Tag Rendered in JSX) */}
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
                      <CheckCircle2 size={13} />
                      <span>Laporan Terkirim</span>
                    </>
                  ) : (
                    <>
                      <Flag size={13} />
                      <span>Laporkan Masalah</span>
                    </>
                  )}
                </button>
              </div>
            ) : youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title="Stream Video Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}`}
                title="Stream Video Player"
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
                  onLoadedMetadata={handleLoadedMetadata}
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
        </div>
      </div>
    </div>
  );
}
