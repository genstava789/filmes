'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Film,
  Tv,
  Search,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  Layers,
  LogIn,
  Crown,
  ShieldCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  ThumbsUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Genre } from '@/types/tmdb';
import { useAuth } from '@/context/AuthContext';
import { MongoMediaRequest } from '@/lib/mongodb/requestService';

interface RequestPageClientProps {
  movieGenres: Genre[];
  tvGenres: Genre[];
}

interface TMDBItem {
  id: number;
  title: string;
  overview?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  year?: string | number | null;
  rating?: number | null;
  genres?: string[];
  mediaType?: 'movie' | 'tv';
}

function parseUrlOrId(input: string): { type?: 'movie' | 'tv'; id?: number } | null {
  const trimmed = input.trim();

  // 1. Check if pure number (TMDB ID)
  if (/^\d+$/.test(trimmed)) {
    return { id: parseInt(trimmed, 10) };
  }

  // 2. Check TMDB URL (e.g. themoviedb.org/movie/12345 or themoviedb.org/tv/67890)
  const tmdbMatch = trimmed.match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
  if (tmdbMatch) {
    return {
      type: tmdbMatch[1].toLowerCase() as 'movie' | 'tv',
      id: parseInt(tmdbMatch[2], 10),
    };
  }

  return null;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari yang lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan yang lalu`;
  return `${Math.floor(diffDay / 365)} tahun yang lalu`;
}

export default function RequestPageClient({
  movieGenres = [],
  tvGenres = [],
}: RequestPageClientProps) {
  const { user, isLoggedIn, authStatus } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Active Feed Tab
  const [activeTab, setActiveTab] = useState<'latest' | 'popular'>('latest');
  const [feedSearch, setFeedSearch] = useState('');
  const [feedPage, setFeedPage] = useState(1);
  const [requests, setRequests] = useState<MongoMediaRequest[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Pop-up Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Request Form State
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [smartQuery, setSmartQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [seasonRequest, setSeasonRequest] = useState('All Seasons');
  const [customSeason, setCustomSeason] = useState('');
  const [message, setMessage] = useState('');

  // Duplicate Alert State
  const [duplicateInfo, setDuplicateInfo] = useState<MongoMediaRequest | null>(null);

  // Submit & Feedback States
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isTV = mediaType === 'tv';

  // ── Fetch Requests Feed ──
  const fetchRequests = async () => {
    setLoadingFeed(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      if (feedSearch.trim()) params.set('q', feedSearch.trim());
      params.set('page', feedPage.toString());
      params.set('limit', '24');

      const res = await fetch(`/api/request?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(data.requests || []);
        setTotalRequests(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch requests feed error:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (mounted && isLoggedIn) {
      fetchRequests();
    }
  }, [activeTab, feedSearch, feedPage, isLoggedIn, mounted]);

  // Handle clicking outside of search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Smart Search & Direct Link / TMDB ID Detection ──
  useEffect(() => {
    const trimmed = smartQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    if (selectedItem && selectedItem.title.toLowerCase() === trimmed.toLowerCase()) {
      return;
    }

    const parsed = parseUrlOrId(trimmed);

    if (parsed && parsed.id) {
      const targetType = parsed.type || mediaType;
      if (parsed.type && parsed.type !== mediaType) {
        setMediaType(parsed.type);
      }

      setSearching(true);
      fetch(`/api/admin/tmdb-preview?id=${parsed.id}&type=${targetType}`)
        .then((res) => res.json())
        .then((previewData) => {
          if (previewData && previewData.title) {
            const item: TMDBItem = {
              id: parsed.id!,
              title: previewData.title,
              overview: previewData.overview,
              posterUrl: previewData.posterUrl,
              backdropUrl: previewData.backdropUrl,
              year: previewData.year,
              rating: previewData.rating,
              genres: previewData.genres,
              mediaType: targetType,
            };
            setSelectedItem(item);
            setCustomTitle(previewData.title);
            if (previewData.genres && Array.isArray(previewData.genres)) {
              setSelectedGenres(previewData.genres);
            }
            setSearchResults([]);
            setSearchDropdownOpen(false);
            setDuplicateInfo(null);
            setFormError(null);
          }
        })
        .catch((err) => {
          console.warn('Direct TMDB lookup failed:', err);
        })
        .finally(() => setSearching(false));

      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/tmdb-search?query=${encodeURIComponent(trimmed)}&type=${mediaType}`
        );
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          setSearchResults(data.results);
          setSearchDropdownOpen(data.results.length > 0);
        } else {
          setSearchResults([]);
          setSearchDropdownOpen(false);
        }
      } catch (err) {
        console.error('TMDB Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [smartQuery, mediaType, selectedItem]);

  const handleMediaTypeSwitch = (newType: 'movie' | 'tv') => {
    if (newType === mediaType) return;
    setMediaType(newType);
    setSelectedItem(null);
    setSmartQuery('');
    setSearchResults([]);
    setSelectedGenres([]);
    setFormError(null);
    setDuplicateInfo(null);
  };

  const handleSelectTMDBItem = async (item: TMDBItem) => {
    setSelectedItem(item);
    setSmartQuery(item.title);
    setCustomTitle(item.title);
    setSearchDropdownOpen(false);
    setFormError(null);
    setDuplicateInfo(null);

    try {
      const previewRes = await fetch(
        `/api/admin/tmdb-preview?id=${item.id}&type=${mediaType}`
      );
      const previewData = await previewRes.json();
      if (previewData && previewData.genres && Array.isArray(previewData.genres)) {
        setSelectedGenres(previewData.genres);
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                genres: previewData.genres,
                overview: previewData.overview || prev.overview,
                year: previewData.year || prev.year,
                posterUrl: previewData.posterUrl || prev.posterUrl,
                backdropUrl: previewData.backdropUrl || prev.backdropUrl,
              }
            : null
        );
      }
    } catch (err) {
      console.warn('Failed to fetch full preview genres:', err);
    }
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setSmartQuery('');
    setCustomTitle('');
    setSelectedGenres([]);
    setDuplicateInfo(null);
  };

  const handleResetForm = () => {
    setSelectedItem(null);
    setSmartQuery('');
    setCustomTitle('');
    setSelectedGenres([]);
    setMessage('');
    setSeasonRequest('All Seasons');
    setCustomSeason('');
    setDuplicateInfo(null);
    setFormError(null);
  };

  // ── Handle Submit Request ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDuplicateInfo(null);

    if (!isLoggedIn) {
      setFormError('Silakan login terlebih dahulu untuk membuat permintaan film/series.');
      return;
    }

    const finalTitle = selectedItem?.title || customTitle.trim();
    if (!finalTitle) {
      setFormError('Silakan masukkan judul atau pilih film/series dari pencarian.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        mediaType,
        title: finalTitle,
        tmdbId: selectedItem?.id || undefined,
        year: selectedItem?.year || undefined,
        posterUrl: selectedItem?.posterUrl || undefined,
        backdropUrl: selectedItem?.backdropUrl || undefined,
        genres: selectedGenres,
        season: isTV ? (seasonRequest === 'Custom' ? customSeason : seasonRequest) : undefined,
        message: message.trim(),
      };

      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.isDuplicate) {
        setDuplicateInfo(data.existingRequest);
        setFormError(data.message);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengirim permintaan.');
      }

      setFormSuccess(true);
      setIsModalOpen(false);
      handleResetForm();
      fetchRequests();
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err: any) {
      console.error('Submit request error:', err);
      setFormError(err.message || 'Terjadi kesalahan saat mengirim permintaan.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle Vote ──
  const handleVote = async (requestId: string) => {
    if (!isLoggedIn) {
      return;
    }

    setVotingId(requestId);

    // Optimistic UI Update
    setRequests((prev) =>
      prev.map((req) => {
        const id = req.id || req._id?.toString();
        if (id === requestId) {
          const isVoted = Boolean(req.hasVoted);
          return {
            ...req,
            hasVoted: !isVoted,
            votes: isVoted ? Math.max(0, req.votes - 1) : req.votes + 1,
          };
        }
        return req;
      })
    );

    try {
      const res = await fetch('/api/request/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        fetchRequests();
      } else {
        setRequests((prev) =>
          prev.map((req) => {
            const id = req.id || req._id?.toString();
            if (id === requestId) {
              return {
                ...req,
                hasVoted: data.hasVoted,
                votes: data.votes,
              };
            }
            return req;
          })
        );
      }
    } catch (err) {
      console.error('Vote error:', err);
      fetchRequests();
    } finally {
      setVotingId(null);
    }
  };

  const handleVoteDuplicate = async (duplicate: MongoMediaRequest) => {
    const id = duplicate.id || duplicate._id?.toString();
    if (id) {
      await handleVote(id);
      setDuplicateInfo(null);
      setFormError(null);
      setIsModalOpen(false);
      setActiveTab('popular');
    }
  };

  // ── 0. Prevent Flicker during hydration / auth resolution ──
  if (!mounted || authStatus === 'initializing') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="text-center text-slate-400 space-y-3">
          <RefreshCw size={28} className="animate-spin mx-auto text-cyan-400" />
          <p className="text-xs font-semibold">Memuat halaman request...</p>
        </div>
      </div>
    );
  }

  // ── 1. UNLOGGED STATE: Clean minimal Lock Screen (No duplicate top hero banner) ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-8 flex items-center justify-center" style={{ background: '#050816' }}>
        <div className="w-full max-w-xl rounded-3xl p-8 sm:p-12 border border-cyan-500/30 bg-gradient-to-b from-[#090e24] via-[#080d20] to-[#050816] text-center shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden animate-fade-in">
          {/* Subtle Ambient Background Light */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />

          <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <LogIn size={34} />
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
            Login Diperlukan untuk Mengajukan Request
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
            Silakan masuk ke akunmu untuk mengajukan permintaan judul film/series baru dan memberikan vote pada permintaan komunitas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login?redirect=/request"
              className="w-full sm:w-auto min-w-[180px] px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Login Sekarang</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login?tab=register&redirect=/request"
              className="w-full sm:w-auto min-w-[160px] px-6 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-slate-300 font-bold text-sm border border-white/10 transition-all text-center"
            >
              Daftar Akun
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. LOGGED IN STATE: Full Request Dashboard with Modal & Feed ──
  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16" style={{ background: '#050816' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ── Top Header Bar ── */}
        <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-[#0b122c] via-[#090e24] to-[#060814] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-2">
              <Sparkles size={13} />
              <span>Komunitas & Aspirasi</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              Request Film & TV Series
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-0.5">
              Pantau permintaan dari komunitas dan ajukan judul film atau serial TV favoritmu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              setDuplicateInfo(null);
              setFormError(null);
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto flex-shrink-0"
          >
            <Plus size={16} />
            <span>Buat Permintaan</span>
          </button>
        </div>

        {/* ── Success Toast Banner ── */}
        {formSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span>Permintaan berhasil dikirim dan ditambahkan ke daftar request komunitas!</span>
            </div>
            <button
              type="button"
              onClick={() => setFormSuccess(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── REQUESTS FEED TOOLBAR & TABS ── */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Tabs: Terbaru & Paling Banyak Diminta */}
            <div className="inline-flex p-1 rounded-2xl bg-[#090e1f] border border-white/10 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('latest');
                  setFeedPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                  activeTab === 'latest'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock size={15} />
                <span>Terbaru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('popular');
                  setFeedPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                  activeTab === 'popular'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame size={15} />
                <span>Paling Banyak Diminta</span>
              </button>
            </div>

            {/* Live Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={feedSearch}
                onChange={(e) => {
                  setFeedSearch(e.target.value);
                  setFeedPage(1);
                }}
                placeholder="Cari judul atau pengirim..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#090e1f] border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* ── Feed Grid Content ── */}
          {loadingFeed ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw size={32} className="animate-spin mx-auto text-cyan-400" />
              <p className="text-xs sm:text-sm font-semibold">Memuat daftar permintaan konten...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#090e1f] border border-white/10 text-center space-y-3">
              <Layers size={36} className="mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-white">Belum Ada Permintaan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {feedSearch
                  ? `Tidak ada permintaan yang cocok dengan "${feedSearch}".`
                  : 'Jadilah yang pertama untuk meminta film atau serial TV favoritmu!'}
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30 hover:bg-cyan-500/30 transition-all inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Buat Permintaan Sekarang</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {requests.map((item) => {
                  const reqId = item.id || item._id?.toString() || '';
                  const isVoting = votingId === reqId;
                  const isVoted = Boolean(item.hasVoted);
                  const isTVItem = item.mediaType === 'tv';

                  return (
                    <div
                      key={reqId}
                      className="group rounded-2xl bg-[#090e1f] border border-white/10 hover:border-cyan-500/40 p-4 space-y-3.5 shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
                    >
                      {/* Top Author Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10">
                            <img
                              src={
                                item.authorAvatar ||
                                `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.authorName)}`
                              }
                              alt={item.authorName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white capitalize block truncate">
                              {item.authorName}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Author Role Badge */}
                        <div className="flex-shrink-0">
                          {item.authorRole === 'owner' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-amber-500/20 border border-amber-500/30 text-amber-300">
                              <Crown size={8} className="text-amber-400 fill-amber-400" />
                              OWNER
                            </span>
                          ) : item.authorRole === 'admin' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                              <ShieldCheck size={8} className="text-cyan-400" />
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-white/5 border border-white/10 text-slate-400">
                              MEMBER
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10 relative">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              {isTVItem ? <Tv size={18} /> : <Film size={18} />}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase ${
                                isTVItem
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {isTVItem ? 'Series' : 'Movie'}
                            </span>
                            {item.year && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {item.year}
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs sm:text-sm text-white truncate mt-1 group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </h4>

                          {item.season && (
                            <p className="text-[10px] text-purple-300 font-medium truncate mt-0.5">
                              {item.season}
                            </p>
                          )}

                          {item.genres && item.genres.length > 0 && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.genres.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Requester Message (Optional Quote) */}
                      {item.message && (
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 italic line-clamp-2">
                          &ldquo;{item.message}&rdquo;
                        </div>
                      )}

                      {/* Action Row: Vote & Status */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <div>
                          {item.status === 'available' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 size={10} />
                              <span>TERSEDIA</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock size={9} />
                              <span>MENUNGGU</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isVoting}
                          onClick={() => handleVote(reqId)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                            isVoted
                              ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-black shadow-md shadow-cyan-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:border-cyan-500/30'
                          }`}
                          title="Beri Vote"
                        >
                          <ThumbsUp
                            size={13}
                            className={`${isVoted ? 'fill-black stroke-black' : ''} ${
                              isVoting ? 'animate-bounce' : ''
                            }`}
                          />
                          <span>{item.votes}</span>
                          <span className="hidden xs:inline text-[10px] opacity-80 font-normal">
                            Vote
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feed Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    type="button"
                    disabled={feedPage === 1}
                    onClick={() => {
                      setFeedPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 border border-white/10 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="px-3 text-xs font-bold text-slate-400">
                    Halaman <strong className="text-white">{feedPage}</strong> dari{' '}
                    <strong className="text-white">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={feedPage >= totalPages}
                    onClick={() => {
                      setFeedPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 border border-white/10 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── CREATE REQUEST POP-UP MODAL ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div
              className="relative w-full max-w-lg rounded-3xl bg-[#0b1026] border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-5 max-h-[90vh] overflow-y-auto animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-2 text-white">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black">
                      Buat Permintaan Baru
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cari film atau serial TV yang ingin ditambahkan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Media Type Switcher */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-400">Tipe Media:</span>
                <div className="inline-flex p-1 rounded-2xl bg-black/50 border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleMediaTypeSwitch('movie')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      mediaType === 'movie'
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film size={12} />
                    <span>Movie</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMediaTypeSwitch('tv')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      mediaType === 'tv'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Tv size={12} />
                    <span>Series</span>
                  </button>
                </div>
              </div>

              {/* Smart Search Input */}
              <div ref={searchContainerRef} className="relative space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Cari Judul, Link TMDB, atau TMDB ID
                </label>

                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={smartQuery}
                    onChange={(e) => {
                      setSmartQuery(e.target.value);
                      setCustomTitle(e.target.value);
                      if (!e.target.value.trim()) setSelectedItem(null);
                    }}
                    placeholder={
                      isTV
                        ? 'Ketik judul serial, paste link TMDB, atau nomor ID...'
                        : 'Ketik judul film, paste link TMDB, atau nomor ID...'
                    }
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[#080d20] border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  {searching ? (
                    <RefreshCw
                      size={15}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin"
                    />
                  ) : smartQuery ? (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>

                {/* Dropdown Live Results */}
                {searchDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#080d20] border border-cyan-500/30 rounded-2xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-white/5">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTMDBItem(item)}
                        className="w-full p-2.5 rounded-xl hover:bg-white/5 transition-all text-left flex items-center gap-3 group"
                      >
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Film size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 truncate transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            {item.year && <span>{item.year}</span>}
                            {item.rating && (
                              <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                <Star size={10} fill="currentColor" />
                                {item.rating.toFixed(1)}
                              </span>
                            )}
                            <span className="text-slate-600 font-mono text-[10px]">
                              #{item.id}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Item Preview Card */}
              {selectedItem && (
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-15 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-cyan-400/30">
                      {selectedItem.posterUrl ? (
                        <img
                          src={selectedItem.posterUrl}
                          alt={selectedItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cyan-400">
                          <Film size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">
                        {selectedItem.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                        {selectedItem.year && <span>{selectedItem.year}</span>}
                        <span className="text-cyan-400 font-mono">#{selectedItem.id}</span>
                        {selectedGenres.length > 0 && (
                          <span className="truncate max-w-[120px]">
                            • {selectedGenres.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Series Season Field */}
              {isTV && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Musim yang Diminta
                  </label>
                  <select
                    value={seasonRequest}
                    onChange={(e) => setSeasonRequest(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#080d20] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="All Seasons">Semua Season (Full Series)</option>
                    <option value="Season 1">Season 1 Saja</option>
                    <option value="Latest Season">Season Terbaru Saja</option>
                    <option value="Custom">Spesifik Season / Episode</option>
                  </select>

                  {seasonRequest === 'Custom' && (
                    <input
                      type="text"
                      value={customSeason}
                      onChange={(e) => setCustomSeason(e.target.value)}
                      placeholder="Contoh: Season 3 Episode 1-12"
                      className="w-full mt-2 px-3.5 py-2.5 bg-[#080d20] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>
              )}

              {/* Optional Notes Message Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Pesan / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 250))}
                  rows={2}
                  placeholder="Catatan khusus, subtitle yang diinginkan, versi extended..."
                  className="w-full px-3.5 py-2.5 bg-[#080d20] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                />
              </div>

              {/* Duplicate Request Alert */}
              {duplicateInfo && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <h4 className="font-extrabold text-xs text-white">
                      Film / Serial Ini Sudah Pernah Direquest!
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Judul <strong className="text-amber-300">{duplicateInfo.title}</strong> sudah tercatat oleh <strong className="text-white capitalize">@{duplicateInfo.authorName}</strong> ({duplicateInfo.votes} vote).
                  </p>
                  <button
                    type="button"
                    onClick={() => handleVoteDuplicate(duplicateInfo)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ThumbsUp size={13} />
                    <span>Vote Permintaan Ini (+1)</span>
                  </button>
                </div>
              )}

              {/* General Form Error Alert */}
              {formError && !duplicateInfo && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>{submitting ? 'Mengirim...' : 'Kirim Permintaan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
