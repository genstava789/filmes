'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Film,
  Tv,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Star,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import siteConfig from '@/config';

interface MovieItem {
  filename: string;
  slug: string;
  relativePath: string;
  frontmatter: {
    tmdb_id?: number | string;
    title?: string;
    videourl?: string;
    video_url?: string;
    image_url?: string;
    poster_path?: string;
    deskripsi?: string;
    description?: string;
    rating?: number | string;
    featured?: boolean;
    subtitles?: string;
    [key: string]: any;
  };
  content: string;
}

interface TVEpisodeItem {
  showSlug: string;
  seasonFolder: string | null;
  filename: string;
  slug: string;
  relativePath: string;
  frontmatter: {
    title?: string;
    videourl?: string;
    video_url?: string;
    image_url?: string;
    deskripsi?: string;
    rating?: number | string;
    duration?: string;
    subtitles?: string;
    [key: string]: any;
  };
  content: string;
}

interface TVShowItem {
  showSlug: string;
  relativePath: string;
  frontmatter: {
    tmdb_id?: number | string;
    title?: string;
    deskripsi?: string;
    image_url?: string;
    rating?: number | string;
    featured?: boolean;
    [key: string]: any;
  };
  content: string;
  episodes: TVEpisodeItem[];
}

interface TMDBPreviewData {
  id: number;
  title: string;
  overview?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  year?: number | null;
  rating?: number | null;
  runtime?: string | null;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres?: string[];
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [tvShows, setTvShows] = useState<TVShowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: 'movie' | 'tv_show' | 'tv_episode';
    relativePath: string;
    frontmatter: Record<string, any>;
    content: string;
  } | null>(null);

  // Form State for Creation
  const [contentType, setContentType] = useState<'movie' | 'tv_show' | 'tv_episode'>('movie');
  const [formTmdbId, setFormTmdbId] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPoster, setFormPoster] = useState('');
  const [formRating, setFormRating] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSubtitles, setFormSubtitles] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formShowSlug, setFormShowSlug] = useState('');
  const [formSeason, setFormSeason] = useState('s1');
  const [formEpisode, setFormEpisode] = useState('e1');

  // Live TMDB Preview State
  const [tmdbPreview, setTmdbPreview] = useState<TMDBPreviewData | null>(null);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      const data = await res.json();
      if (res.ok) {
        setMovies(data.movies || []);
        setTvShows(data.tvShows || []);
      } else {
        showToast(data.error || 'Failed to load content', 'error');
      }
    } catch (e: any) {
      showToast('Network error loading content', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // TMDB Autofetch preview
  const handleFetchTmdbPreview = async (id: string, type: 'movie' | 'tv') => {
    if (!id || !/^\d+$/.test(id.trim())) return;
    setFetchingTmdb(true);
    try {
      const res = await fetch(`/api/admin/tmdb-preview?id=${id.trim()}&type=${type}`);
      const data = await res.json();
      if (res.ok) {
        setTmdbPreview(data);
        if (!formTitle && data.title) setFormTitle(data.title);
        if (!formDesc && data.overview) setFormDesc(data.overview);
        if (!formPoster && data.posterUrl) setFormPoster(data.posterUrl);
        if (!formRating && data.rating) setFormRating(String(data.rating));
      } else {
        setTmdbPreview(null);
      }
    } catch (e) {
      setTmdbPreview(null);
    } finally {
      setFetchingTmdb(false);
    }
  };

  const resetCreateForm = () => {
    setFormTmdbId('');
    setFormVideoUrl('');
    setFormTitle('');
    setFormDesc('');
    setFormPoster('');
    setFormRating('');
    setFormFeatured(false);
    setFormSubtitles('');
    setFormSlug('');
    setFormDuration('');
    setFormShowSlug('');
    setFormSeason('s1');
    setFormEpisode('e1');
    setTmdbPreview(null);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contentType === 'movie' || contentType === 'tv_show') {
      if (!formTmdbId.trim()) {
        showToast('TMDB ID is required!', 'error');
        return;
      }
    }
    if (contentType === 'movie' || contentType === 'tv_episode') {
      if (!formVideoUrl.trim()) {
        showToast('URL Video (videourl) is required!', 'error');
        return;
      }
    }
    if (contentType === 'tv_episode' && !formShowSlug.trim()) {
      showToast('Show slug is required for episode!', 'error');
      return;
    }

    try {
      const payload: any = {
        contentType,
        tmdb_id: formTmdbId ? Number(formTmdbId) : undefined,
        videourl: formVideoUrl.trim(),
        title: formTitle.trim() || undefined,
        desc: formDesc.trim() || undefined,
        poster: formPoster.trim() || undefined,
        rating: formRating ? Number(formRating) : undefined,
        featured: formFeatured,
        subtitles: formSubtitles.trim() || undefined,
        slug: formSlug.trim() || undefined,
        duration: formDuration.trim() || undefined,
        showSlug: formShowSlug.trim() || undefined,
        season: formSeason.trim() || undefined,
        episode: formEpisode.trim() || undefined,
      };

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        showToast(`Berhasil dibuat: ${result.relativePath}`);
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchContent();
      } else {
        showToast(result.error || 'Failed to create content', 'error');
      }
    } catch (e: any) {
      showToast('Error sending request', 'error');
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relativePath: editingItem.relativePath,
          frontmatter: editingItem.frontmatter,
          content: editingItem.content,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showToast(`Perubahan berhasil disimpan!`);
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchContent();
      } else {
        showToast(result.error || 'Failed to update content', 'error');
      }
    } catch (e) {
      showToast('Error updating content', 'error');
    }
  };

  // Delete Content
  const handleDelete = async (relativePath: string, label: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${label}" (${relativePath})?`)) return;

    try {
      const res = await fetch(`/api/admin/content?path=${encodeURIComponent(relativePath)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Berhasil menghapus: ${label}`);
        fetchContent();
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch (e) {
      showToast('Error deleting content', 'error');
    }
  };

  // Filtered lists
  const filteredMovies = movies.filter((m) => {
    const q = searchQuery.toLowerCase();
    const title = (m.frontmatter.title || m.slug).toLowerCase();
    const tmdbId = String(m.frontmatter.tmdb_id || '');
    return title.includes(q) || tmdbId.includes(q) || m.filename.toLowerCase().includes(q);
  });

  const filteredTvShows = tvShows.filter((s) => {
    const q = searchQuery.toLowerCase();
    const title = (s.frontmatter.title || s.showSlug).toLowerCase();
    const tmdbId = String(s.frontmatter.tmdb_id || '');
    return title.includes(q) || tmdbId.includes(q) || s.showSlug.toLowerCase().includes(q);
  });

  const totalEpisodes = tvShows.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#050816] text-white pt-20 pb-16 px-4 sm:px-6 md:px-8 lg:px-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border transition-all animate-slide-up"
          style={{
            background: toastMessage.type === 'success' ? '#064e3b' : '#7f1d1d',
            borderColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Sparkles size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Content Manager CMS
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Kelola konten custom movie (<code className="text-cyan-400">video/</code>) dan TV series (
              <code className="text-pink-400">tv/</code>) langsung dari browser.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchContent()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              <span>Tambah Konten Baru</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Film size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Movies</p>
              <h3 className="text-2xl font-extrabold text-white">{movies.length}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Tv size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom TV Series</p>
              <h3 className="text-2xl font-extrabold text-white">{tvShows.length}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Custom Episodes</p>
              <h3 className="text-2xl font-extrabold text-white">{totalEpisodes}</h3>
            </div>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('movies')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'movies'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film size={16} />
              <span>Movies ({movies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tv')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'tv'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv size={16} />
              <span>TV Series ({tvShows.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, slug, atau TMDB ID..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw size={36} className="animate-spin mx-auto text-cyan-400 mb-3" />
            <p className="text-slate-400 text-sm">Memuat konten markdown...</p>
          </div>
        ) : activeTab === 'movies' ? (
          /* Movies List */
          filteredMovies.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c1224] border border-white/10">
              <Film size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Belum ada custom movie</h3>
              <p className="text-slate-400 text-sm mb-4">
                Buat file markdown movie pertama Anda dengan menekan tombol di bawah.
              </p>
              <button
                onClick={() => {
                  setContentType('movie');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white transition-all"
              >
                <Plus size={16} />
                <span>Tambah Movie</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMovies.map((movie) => {
                const title = movie.frontmatter.title || movie.slug;
                const tmdbId = movie.frontmatter.tmdb_id;
                const videoUrl = movie.frontmatter.videourl || movie.frontmatter.video_url || '';
                const poster = movie.frontmatter.image_url || movie.frontmatter.poster_path;
                const rating = movie.frontmatter.rating;
                const featured = movie.frontmatter.featured;

                return (
                  <div
                    key={movie.relativePath}
                    className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10">
                          {poster ? (
                            <Image src={poster} alt={title} fill className="object-cover" sizes="64px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Film size={24} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              TMDB {tmdbId}
                            </span>
                            {featured && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                <Sparkles size={10} />
                                Featured
                              </span>
                            )}
                            {rating && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                <Star size={10} fill="currentColor" />
                                {rating}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-white text-base truncate" title={title}>
                            {title}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono truncate">{movie.relativePath}</p>
                        </div>
                      </div>

                      {/* Video URL Display */}
                      <div className="mb-4 p-2.5 rounded-xl bg-black/30 border border-white/5">
                        <p className="text-[11px] text-slate-400 font-medium mb-0.5">URL Video:</p>
                        <p className="text-xs text-slate-300 font-mono truncate" title={videoUrl}>
                          {videoUrl || <span className="text-red-400">Belum diisi</span>}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <Link
                        href={`/movie/${movie.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline"
                      >
                        <ExternalLink size={13} />
                        <span>Buka Halaman</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem({
                              type: 'movie',
                              relativePath: movie.relativePath,
                              frontmatter: { ...movie.frontmatter },
                              content: movie.content,
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                          title="Edit Post"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(movie.relativePath, title)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                          title="Hapus Post"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* TV Series & Episodes List */
          filteredTvShows.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c1224] border border-white/10">
              <Tv size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Belum ada custom TV Series</h3>
              <p className="text-slate-400 text-sm mb-4">
                Buat TV Series pertama Anda dengan menekan tombol di bawah.
              </p>
              <button
                onClick={() => {
                  setContentType('tv_show');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-pink-500 hover:bg-pink-400 text-white transition-all"
              >
                <Plus size={16} />
                <span>Tambah TV Show</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTvShows.map((show) => {
                const title = show.frontmatter.title || show.showSlug;
                const tmdbId = show.frontmatter.tmdb_id;
                const poster = show.frontmatter.image_url;

                return (
                  <div
                    key={show.showSlug}
                    className="p-5 sm:p-6 rounded-2xl bg-[#0c1224] border border-white/10 hover:border-pink-500/40 transition-all"
                  >
                    {/* Show Main Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10">
                          {poster ? (
                            <Image src={poster} alt={title} fill className="object-cover" sizes="56px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Tv size={24} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                              TMDB {tmdbId}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              {show.episodes.length} Episodes
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-lg">{title}</h3>
                          <p className="text-xs text-slate-400 font-mono">tv/{show.showSlug}/_index.md</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tv/${show.showSlug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-400 transition-all"
                        >
                          <ExternalLink size={13} />
                          <span>Halaman Show</span>
                        </Link>

                        <button
                          onClick={() => {
                            setFormShowSlug(show.showSlug);
                            setContentType('tv_episode');
                            setIsCreateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-all"
                        >
                          <Plus size={13} />
                          <span>Tambah Episode</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingItem({
                              type: 'tv_show',
                              relativePath: show.relativePath,
                              frontmatter: { ...show.frontmatter },
                              content: show.content,
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                          title="Edit Show Details"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(`tv/${show.showSlug}`, title)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          title="Hapus Seluruh TV Series"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Episodes Grid */}
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Daftar Episode:
                      </h4>

                      {show.episodes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Belum ada episode di series ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {show.episodes.map((ep) => {
                            const epTitle = ep.frontmatter.title || ep.slug;
                            const epVideo = ep.frontmatter.videourl || ep.frontmatter.video_url;
                            const seasonLabel = ep.seasonFolder ? ep.seasonFolder.toUpperCase() : 'Flat';
                            const linkPath = ep.seasonFolder
                              ? `/tv/${show.showSlug}/${ep.seasonFolder}/${ep.slug}`
                              : `/tv/${show.showSlug}/${ep.slug}`;

                            return (
                              <div
                                key={ep.relativePath}
                                className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                                      {seasonLabel} : {ep.slug.toUpperCase()}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingItem({
                                            type: 'tv_episode',
                                            relativePath: ep.relativePath,
                                            frontmatter: { ...ep.frontmatter },
                                            content: ep.content,
                                          });
                                          setIsEditModalOpen(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-white"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(ep.relativePath, epTitle)}
                                        className="p-1 rounded text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <h5 className="font-semibold text-white text-xs truncate mb-1" title={epTitle}>
                                    {epTitle}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 font-mono truncate" title={epVideo}>
                                    {epVideo || <span className="text-red-400">Video belum ada</span>}
                                  </p>
                                </div>

                                <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                                  <Link
                                    href={linkPath}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                                  >
                                    <Play size={11} />
                                    <span>Tonton</span>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ────────────────────────────────────────── */}
      {/* Modal: Buat Konten Baru */}
      {/* ────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c1224] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Tambah Post Konten Baru</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Content Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tipe Konten
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContentType('movie');
                      setTmdbPreview(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      contentType === 'movie'
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎬 Movie
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContentType('tv_show');
                      setTmdbPreview(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      contentType === 'tv_show'
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    📺 TV Series (_index)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContentType('tv_episode');
                      setTmdbPreview(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      contentType === 'tv_episode'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎞️ TV Episode
                  </button>
                </div>
              </div>

              {/* TMDB ID & Live Autofetch (Required for Movie & TV Show) */}
              {(contentType === 'movie' || contentType === 'tv_show') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    TMDB ID <span className="text-red-400 font-extrabold">* (Wajib)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formTmdbId}
                      onChange={(e) => setFormTmdbId(e.target.value)}
                      placeholder="Contoh: 1288445"
                      required
                      className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchTmdbPreview(formTmdbId, contentType === 'movie' ? 'movie' : 'tv')}
                      disabled={fetchingTmdb || !formTmdbId}
                      className="px-4 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className={fetchingTmdb ? 'animate-spin' : ''} />
                      <span>{fetchingTmdb ? 'Fetching...' : 'Auto-Fetch TMDB'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TMDB Live Preview Card */}
              {tmdbPreview && (
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-3.5">
                  {tmdbPreview.posterUrl && (
                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                      <Image src={tmdbPreview.posterUrl} alt="Preview" fill className="object-cover" sizes="48px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-cyan-300 truncate">
                      {tmdbPreview.title} {tmdbPreview.year ? `(${tmdbPreview.year})` : ''}
                    </p>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{tmdbPreview.overview}</p>
                  </div>
                </div>
              )}

              {/* URL Video (Required for Movie and Episode) */}
              {(contentType === 'movie' || contentType === 'tv_episode') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    URL Video / Stream Link <span className="text-red-400 font-extrabold">* (Wajib)</span>
                  </label>
                  <input
                    type="text"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="https://.../video.mp4 atau direct link / mkv / m3u8"
                    required
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              )}

              {/* TV Episode specifics */}
              {contentType === 'tv_episode' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Show Slug <span className="text-red-400 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      value={formShowSlug}
                      onChange={(e) => setFormShowSlug(e.target.value)}
                      placeholder="lanterns"
                      required
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Season</label>
                    <input
                      type="text"
                      value={formSeason}
                      onChange={(e) => setFormSeason(e.target.value)}
                      placeholder="s1 (kosongkan jika flat)"
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Episode</label>
                    <input
                      type="text"
                      value={formEpisode}
                      onChange={(e) => setFormEpisode(e.target.value)}
                      placeholder="e1"
                      required
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* Title Override (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Judul Custom (Opsional - menggantikan data TMDB)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Opsional, biarkan kosong untuk data TMDB otomatis"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Deskripsi (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Deskripsi / Sinopsis (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Poster / Image URL (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Poster Image URL (Opsional)
                </label>
                <input
                  type="text"
                  value={formPoster}
                  onChange={(e) => setFormPoster(e.target.value)}
                  placeholder="https://image.tmdb.org/... atau link poster"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Rating & Featured (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rating (Opsional)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    placeholder="Contoh: 8.8"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-5 h-5 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-400"
                  />
                  <label htmlFor="featuredCheckbox" className="text-xs font-bold text-white select-none">
                    ✨ Jadikan Featured di Homepage
                  </label>
                </div>
              </div>

              {/* Subtitles (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Subtitles URL (Opsional .vtt / .srt)
                </label>
                <input
                  type="text"
                  value={formSubtitles}
                  onChange={(e) => setFormSubtitles(e.target.value)}
                  placeholder="https://.../subtitle.vtt"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                >
                  Simpan Post Konten
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────── */}
      {/* Modal: Edit Konten */}
      {/* ────────────────────────────────────────── */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c1224] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Edit2 size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Edit Konten ({editingItem.relativePath})</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* TMDB ID (if movie or show) */}
              {editingItem.type !== 'tv_episode' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">TMDB ID</label>
                  <input
                    type="number"
                    value={editingItem.frontmatter.tmdb_id || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        frontmatter: { ...editingItem.frontmatter, tmdb_id: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Video URL */}
              {editingItem.type !== 'tv_show' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">URL Video (videourl)</label>
                  <input
                    type="text"
                    value={editingItem.frontmatter.videourl || editingItem.frontmatter.video_url || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        frontmatter: { ...editingItem.frontmatter, videourl: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Judul (Title)</label>
                <input
                  type="text"
                  value={editingItem.frontmatter.title || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      frontmatter: { ...editingItem.frontmatter, title: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editingItem.frontmatter.deskripsi || editingItem.frontmatter.description || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      frontmatter: { ...editingItem.frontmatter, deskripsi: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Poster / Image URL</label>
                <input
                  type="text"
                  value={editingItem.frontmatter.image_url || editingItem.frontmatter.poster_path || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      frontmatter: { ...editingItem.frontmatter, image_url: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Rating & Featured */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingItem.frontmatter.rating || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        frontmatter: { ...editingItem.frontmatter, rating: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="editFeatured"
                    checked={Boolean(editingItem.frontmatter.featured)}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        frontmatter: { ...editingItem.frontmatter, featured: e.target.checked },
                      })
                    }
                    className="w-5 h-5 rounded bg-black/40 border-white/10 text-cyan-500 focus:ring-cyan-400"
                  />
                  <label htmlFor="editFeatured" className="text-xs font-bold text-white select-none">
                    Featured di Homepage
                  </label>
                </div>
              </div>

              {/* Markdown Content */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Konten Markdown Body (Opsional)
                </label>
                <textarea
                  rows={4}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder="Tulis markdown artikel atau catatan..."
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
