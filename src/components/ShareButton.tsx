'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
  Twitter,
  Facebook,
} from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url?: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const shareUrl = getShareUrl();
  const shareText = `Nonton ${title} full streaming HD di LeviStream:`;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to modal if user cancelled or not allowed
      }
    }
    setModalOpen(true);
  };

  const handleCopyLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  // Close modal on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };
    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalOpen]);

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      bg: 'rgba(37, 211, 102, 0.15)',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: '#229ED9',
      bg: 'rgba(34, 158, 217, 0.15)',
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: '#1DA1F2',
      bg: 'rgba(29, 161, 242, 0.15)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      bg: 'rgba(24, 119, 242, 0.15)',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <div className="relative">
      {/* Share Button Trigger */}
      <button
        type="button"
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-200 hover:text-cyan-300 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
        title="Bagikan ke Sosial Media"
      >
        <Share2 size={16} className="text-cyan-400" />
        <span>Share</span>
      </button>

      {/* Share Modal Dialog */}
      {modalOpen && (
        <div
          ref={modalRef}
          className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 sm:w-80 p-4 rounded-3xl z-50 border transition-all duration-200 shadow-2xl animate-in fade-in slide-in-from-top-2"
          style={{
            background: 'rgba(8, 12, 28, 0.96)',
            backdropFilter: 'blur(30px)',
            borderColor: 'rgba(6, 182, 212, 0.35)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">Bagikan Link</span>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Social Links Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setModalOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
                  style={{
                    background: social.bg,
                    border: `1px solid ${social.color}40`,
                  }}
                >
                  <Icon size={16} style={{ color: social.color }} />
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                    {social.name}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Copy Link Input Bar */}
          <div className="pt-2 border-t border-white/[0.08]">
            <div
              className="flex items-center justify-between p-1.5 pl-3 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-[11px] text-slate-300 focus:outline-none flex-1 truncate pr-2"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                style={{
                  background: copied
                    ? '#22c55e'
                    : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  boxShadow: copied ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
                }}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
