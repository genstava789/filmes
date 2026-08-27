import React, { useState } from 'react';
import Image from 'next/image';
import {
  Film,
  Tv,
  Plus,
  Minus,
  Sparkles,
  Search,
  X,
  Star,
  CheckCircle,
  AlertCircle,
  Play,
  ImageIcon,
} from 'lucide-react';
import { DraftSeason, TMDBPreviewData, MovieItem, TVShowItem } from '../types';
import { BackdropPicker } from './BackdropPicker';
import { cleanVideoUrl, slugify, extractTmdbIdAndType } from '@/lib/urls';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'movie' | 'tv_show' | 'tv_episode';
  setContentType: (t: 'movie' | 'tv_show' | 'tv_episode') => void;
  onSubmit: (payload: any) => Promise<void>;
  movies: MovieItem[];
  tvShows: TVShowItem[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  contentType,
  setContentType,
  onSubmit,
  movies,
  tvShows,
  showToast,
}) => {
  const [formTmdbId, setFormTmdbId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formPoster, setFormPoster] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRating, setFormRating] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSubtitles, setFormSubtitles] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formTvShowSlug, setFormTvShowSlug] = useState('');
  const [formSeasonNum, setFormSeasonNum] = useState('s1');
  const [formEpisodeNum, setFormEpisodeNum] = useState('e1');

  // Multi-season episodes for TV Series
  const [formSeasons, setFormSeasons] = useState<DraftSeason[]>([
    {
      id: 's1',
      season: 's1',
      episodes: [{ id: 'e1', episode: 'e1', videourl: '', title: '', image_url: '' }],
    },
  ]);

  // TMDB Live Preview & Backdrops
  const [tmdbPreview, setTmdbPreview] = useState<TMDBPreviewData | null>(null);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);
  const [showBackdropPicker, setShowBackdropPicker] = useState(false);
  const [activeEpisodeDraftId, setActiveEpisodeDraftId] = useState<string | null>(null);
  const [batchUrlsInput, setBatchUrlsInput] = useState('');
  const [showBatchUrlInput, setShowBatchUrlInput] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFetchTmdb = async (idInput: string, type: 'movie' | 'tv') => {
    const extracted = extractTmdbIdAndType(idInput);
    const idToUse = extracted.id || idInput.trim();
    if (!idToUse) return;

    setFetchingTmdb(true);
    try {
      const res = await fetch(
        `/api/admin/tmdb-preview?id=${encodeURIComponent(idToUse)}&type=${type}&include_images=true`
      );
      if (res.ok) {
        const data: TMDBPreviewData = await res.json();
        setTmdbPreview(data);
        if (!formTitle && data.title) setFormTitle(data.title);
        if (!formDesc && data.overview) setFormDesc(data.overview);
        if (!formPoster && data.posterUrl) setFormPoster(data.posterUrl);
        if (!formRating && data.rating) setFormRating(String(data.rating));
        showToast('Metadata TMDB berhasil dimuat!');
      }
    } catch {
      showToast('Gagal memuat metadata TMDB', 'error');
    } finally {
      setFetchingTmdb(false);
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (contentType === 'movie') {
      if (!formTmdbId) errors.formTmdbId = 'TMDB ID wajib diisi';
      if (!formVideoUrl) errors.formVideoUrl = 'URL Video wajib diisi';
    } else if (contentType === 'tv_show') {
      if (!formTmdbId) errors.formTmdbId = 'TMDB ID wajib diisi';
    } else if (contentType === 'tv_episode') {
      if (!formTvShowSlug) errors.formTvShowSlug = 'TV Series wajib dipilih';
      if (!formVideoUrl) errors.formVideoUrl = 'URL Video wajib diisi';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Mohon lengkapi field yang wajib diisi', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        contentType,
        tmdb_id: formTmdbId,
        title: formTitle,
        slug: formSlug,
        videourl: formVideoUrl,
        poster: formPoster,
        desc: formDesc,
        rating: formRating,
        featured: formFeatured,
        subtitles: formSubtitles,
        duration: formDuration,
        showSlug: formTvShowSlug,
        season: formSeasonNum,
        episode: formEpisodeNum,
        seasons: formSeasons,
      };
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat konten', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyBatchUrls = (seasonId: string) => {
    if (!batchUrlsInput.trim()) return;
    const lines = batchUrlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.id !== seasonId) return s;
        const newEps = lines.map((url, idx) => {
          const epNum = idx + 1;
          const cleanUrl = cleanVideoUrl(url) || url;
          return {
            id: `ep_batch_${Date.now()}_${epNum}`,
            episode: `e${epNum}`,
            videourl: cleanUrl,
            title: `Episode ${epNum}`,
            image_url: formPoster || '',
          };
        });
        return { ...s, episodes: newEps };
      })
    );

    setBatchUrlsInput('');
    setShowBatchUrlInput(false);
    showToast(`${lines.length} episode berhasil ditambahkan!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1329] border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#090e1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Tambah Konten Baru</h2>
              <p className="text-[11px] text-slate-400">Pilih tipe konten dan masukkan metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="px-5 pt-4 pb-2 border-b border-white/5 flex gap-2 bg-[#090e1f]/50">
          <button
            type="button"
            onClick={() => setContentType('movie')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              contentType === 'movie'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Film size={14} />
            <span>Movie</span>
          </button>
          <button
            type="button"
            onClick={() => setContentType('tv_show')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              contentType === 'tv_show'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Tv size={14} />
            <span>TV Series</span>
          </button>
          <button
            type="button"
            onClick={() => setContentType('tv_episode')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              contentType === 'tv_episode'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Play size={14} />
            <span>Single Episode</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TMDB ID & Autofill */}
          {contentType !== 'tv_episode' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                TMDB ID atau URL TMDB <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formTmdbId}
                  onChange={(e) => setFormTmdbId(e.target.value)}
                  placeholder="Contoh: 1288445 atau https://www.themoviedb.org/movie/1288445"
                  className={`flex-1 px-3 py-2 bg-black/50 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    formErrors.formTmdbId ? 'border-red-500' : 'border-white/10 focus:border-cyan-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleFetchTmdb(formTmdbId, contentType === 'movie' ? 'movie' : 'tv')
                  }
                  disabled={fetchingTmdb || !formTmdbId}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Sparkles size={14} className={fetchingTmdb ? 'animate-spin' : ''} />
                  <span>{fetchingTmdb ? 'Mengambil...' : 'Autofill TMDB'}</span>
                </button>
              </div>
              {formErrors.formTmdbId && (
                <p className="text-[10px] text-red-400">{formErrors.formTmdbId}</p>
              )}
            </div>
          )}

          {/* Episode Parent Show Picker */}
          {contentType === 'tv_episode' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih TV Series <span className="text-red-400">*</span>
                </label>
                <select
                  value={formTvShowSlug}
                  onChange={(e) => setFormTvShowSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Pilih Series --</option>
                  {tvShows.map((s) => (
                    <option key={s.showSlug} value={s.showSlug}>
                      {s.displayTitle || s.showSlug}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Season</label>
                <input
                  type="text"
                  value={formSeasonNum}
                  onChange={(e) => setFormSeasonNum(e.target.value)}
                  placeholder="s1"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Episode</label>
                <input
                  type="text"
                  value={formEpisodeNum}
                  onChange={(e) => setFormEpisodeNum(e.target.value)}
                  placeholder="e1"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Kustom</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Judul Film atau Series"
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Custom Slug (Opsional)
              </label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="nama-film-2026"
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Movie / Episode Video Stream URL */}
          {contentType !== 'tv_show' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL Video Stream (MP4 / MKV / HLS .m3u8) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formVideoUrl}
                onChange={(e) => setFormVideoUrl(e.target.value)}
                placeholder="https://server.com/video.mp4 atau .m3u8"
                className={`w-full px-3 py-2 bg-black/50 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono ${
                  formErrors.formVideoUrl
                    ? 'border-red-500'
                    : 'border-white/10 focus:border-cyan-500'
                }`}
              />
              {formErrors.formVideoUrl && (
                <p className="text-[10px] text-red-400 mt-0.5">{formErrors.formVideoUrl}</p>
              )}
            </div>
          )}

          {/* Poster & Backdrop Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Image Poster / Backdrop URL
              </label>
              {tmdbPreview?.backdrops && tmdbPreview.backdrops.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveEpisodeDraftId(null);
                    setShowBackdropPicker(!showBackdropPicker);
                  }}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <ImageIcon size={12} />
                  <span>
                    {showBackdropPicker ? 'Tutup Galeri' : `Pilih dari Galeri (${tmdbPreview.backdrops.length})`}
                  </span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={formPoster}
              onChange={(e) => setFormPoster(e.target.value)}
              placeholder="https://image.tmdb.org/t/p/... atau pilih dari galeri"
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            {showBackdropPicker && tmdbPreview?.backdrops && (
              <BackdropPicker
                backdrops={tmdbPreview.backdrops}
                selectedUrl={formPoster}
                onSelect={(url) => {
                  if (activeEpisodeDraftId) {
                    setFormSeasons((prev) =>
                      prev.map((s) => ({
                        ...s,
                        episodes: s.episodes.map((ep) =>
                          ep.id === activeEpisodeDraftId ? { ...ep, image_url: url } : ep
                        ),
                      }))
                    );
                    setActiveEpisodeDraftId(null);
                    showToast('Backdrop episode diterapkan!');
                  } else {
                    setFormPoster(url);
                    showToast('Backdrop series diterapkan!');
                  }
                  setShowBackdropPicker(false);
                }}
                onClose={() => setShowBackdropPicker(false)}
              />
            )}
          </div>

          {/* Rating, Featured, Subtitles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rating (0 - 10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formRating}
                onChange={(e) => setFormRating(e.target.value)}
                placeholder="8.5"
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subtitles (VTT/SRT)</label>
              <input
                type="text"
                value={formSubtitles}
                onChange={(e) => setFormSubtitles(e.target.value)}
                placeholder="https://server.com/sub.vtt"
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-black/50 border-white/20"
                />
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> Featured di Hero
                </span>
              </label>
            </div>
          </div>

          {/* Overview / Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Deskripsi / Sinopsis
            </label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Sinopsis singkat film/series..."
              className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* TV Series Multi-Season Episode Batch Creator */}
          {contentType === 'tv_show' && (
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Tv size={15} className="text-pink-400" />
                  <span className="text-xs font-bold text-white">Kelola Season & Episode</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormSeasons((prev) => [
                      ...prev,
                      {
                        id: `s${prev.length + 1}`,
                        season: `s${prev.length + 1}`,
                        episodes: [
                          {
                            id: `e1_${Date.now()}`,
                            episode: 'e1',
                            videourl: '',
                            title: '',
                            image_url: formPoster || '',
                          },
                        ],
                      },
                    ])
                  }
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1"
                >
                  <Plus size={11} /> Tambah Season
                </button>
              </div>

              {formSeasons.map((season, sIdx) => (
                <div
                  key={season.id}
                  className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-300">Season {sIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setShowBatchUrlInput(!showBatchUrlInput)}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      {showBatchUrlInput ? 'Tutup Batch Paste' : 'Batch Paste Video URLs'}
                    </button>
                  </div>

                  {showBatchUrlInput && (
                    <div className="p-2.5 rounded-lg bg-black/50 border border-cyan-500/30 space-y-2">
                      <textarea
                        rows={4}
                        value={batchUrlsInput}
                        onChange={(e) => setBatchUrlsInput(e.target.value)}
                        placeholder="Paste URL video per baris (baris 1 = Ep 1, baris 2 = Ep 2)..."
                        className="w-full p-2 bg-black/60 border border-white/10 rounded-lg text-[11px] text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyBatchUrls(season.id)}
                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] rounded-md"
                      >
                        Terapkan ke Season Ini
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {season.episodes.map((ep, eIdx) => (
                      <div
                        key={ep.id}
                        className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2 text-xs"
                      >
                        <span className="font-mono text-[10px] text-pink-400 font-bold w-6">
                          E{eIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={ep.videourl}
                          onChange={(e) =>
                            setFormSeasons((prev) =>
                              prev.map((s) =>
                                s.id === season.id
                                  ? {
                                      ...s,
                                      episodes: s.episodes.map((item) =>
                                        item.id === ep.id
                                          ? { ...item, videourl: e.target.value }
                                          : item
                                      ),
                                    }
                                  : s
                              )
                            )
                          }
                          placeholder="URL Video stream..."
                          className="flex-1 px-2 py-1 bg-black/60 border border-white/10 rounded text-[11px] text-white font-mono focus:outline-none focus:border-pink-400"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormSeasons((prev) =>
                        prev.map((s) =>
                          s.id === season.id
                            ? {
                                ...s,
                                episodes: [
                                  ...s.episodes,
                                  {
                                    id: `ep_${Date.now()}`,
                                    episode: `e${s.episodes.length + 1}`,
                                    videourl: '',
                                    title: `Episode ${s.episodes.length + 1}`,
                                    image_url: formPoster || '',
                                  },
                                ],
                              }
                            : s
                        )
                      )
                    }
                    className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <Plus size={10} /> Tambah Baris Episode
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Konten'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
