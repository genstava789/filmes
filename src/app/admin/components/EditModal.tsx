import React, { useState, useEffect } from 'react';
import {
  Edit2,
  X,
  Star,
  CheckCircle,
  ImageIcon,
  Sparkles,
  Layers,
  Plus,
  Play,
  Trash2,
} from 'lucide-react';
import { EditingItemState, TMDBPreviewData, TVShowItem } from '../types';
import { BackdropPicker } from './BackdropPicker';
import { extractTmdbIdAndType, cleanVideoUrl } from '@/lib/urls';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: EditingItemState | null;
  setEditingItem: React.Dispatch<React.SetStateAction<EditingItemState | null>>;
  onSubmit: (item: EditingItemState) => Promise<void>;
  tvShows: TVShowItem[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onQuickAddEpisodeToEditingShow?: (seasonSlug: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  setEditingItem,
  onSubmit,
  tvShows,
  showToast,
  onQuickAddEpisodeToEditingShow,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [tmdbPreview, setTmdbPreview] = useState<TMDBPreviewData | null>(null);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);
  const [showBackdropPicker, setShowBackdropPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem && isOpen) {
      let tmdbIdToFetch = editingItem.frontmatter.tmdb_id;
      if (!tmdbIdToFetch && editingItem.type === 'tv_episode') {
        const showSlug = editingItem.relativePath.split('/')[1];
        const show = tvShows.find((s) => s.showSlug === showSlug);
        tmdbIdToFetch = show?.frontmatter.tmdb_id;
      }
      if (tmdbIdToFetch) {
        handleFetchTmdb(String(tmdbIdToFetch), editingItem.type === 'movie' ? 'movie' : 'tv');
      }
    }
  }, [editingItem?.relativePath, isOpen]);

  if (!isOpen || !editingItem) return null;

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
      }
    } catch {
    } finally {
      setFetchingTmdb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(editingItem);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan perubahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFrontmatter = (key: string, value: any) => {
    setEditingItem({
      ...editingItem,
      frontmatter: {
        ...editingItem.frontmatter,
        [key]: value,
      },
    });
  };

  const currentShow =
    editingItem.type === 'tv_show'
      ? tvShows.find((s) => s.relativePath === editingItem.relativePath)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0b1329] border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#090e1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Edit2 size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Edit {editingItem.type === 'movie' ? 'Movie' : editingItem.type === 'tv_show' ? 'TV Series' : 'Episode'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate max-w-md">
                {editingItem.relativePath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher for TV Series */}
        {editingItem.type === 'tv_show' && currentShow && (
          <div className="px-5 pt-3 pb-2 border-b border-white/5 flex gap-2 bg-[#090e1f]/50">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'info'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Info & Metadata Series
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'episodes'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>Kelola Episode ({currentShow.episodes.length})</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'info' ? (
            <>
              {/* TMDB ID & Autofill */}
              {editingItem.type !== 'tv_episode' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    TMDB ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingItem.frontmatter.tmdb_id || ''}
                      onChange={(e) => updateFrontmatter('tmdb_id', Number(e.target.value))}
                      placeholder="TMDB ID"
                      className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleFetchTmdb(
                          String(editingItem.frontmatter.tmdb_id),
                          editingItem.type === 'movie' ? 'movie' : 'tv'
                        )
                      }
                      disabled={fetchingTmdb || !editingItem.frontmatter.tmdb_id}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={14} className={fetchingTmdb ? 'animate-spin' : ''} />
                      <span>{fetchingTmdb ? 'Memuat...' : 'Cek TMDB'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Kustom (Title)
                </label>
                <input
                  type="text"
                  value={editingItem.frontmatter.title || ''}
                  onChange={(e) => updateFrontmatter('title', e.target.value)}
                  placeholder="Judul Film atau Series"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Video URL (Movies & Episodes) */}
              {editingItem.type !== 'tv_show' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL Video Stream (videourl)
                  </label>
                  <input
                    type="text"
                    value={editingItem.frontmatter.videourl || editingItem.frontmatter.video_url || ''}
                    onChange={(e) => updateFrontmatter('videourl', e.target.value)}
                    placeholder="https://server.com/video.mp4 atau .m3u8"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {/* Poster / Backdrop Image URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Image Poster / Backdrop URL (image_url)
                  </label>
                  {tmdbPreview?.backdrops && tmdbPreview.backdrops.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBackdropPicker(!showBackdropPicker)}
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
                  value={editingItem.frontmatter.image_url || editingItem.frontmatter.poster_path || ''}
                  onChange={(e) => updateFrontmatter('image_url', e.target.value)}
                  placeholder="https://image.tmdb.org/t/p/..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                {showBackdropPicker && tmdbPreview?.backdrops && (
                  <BackdropPicker
                    backdrops={tmdbPreview.backdrops}
                    selectedUrl={editingItem.frontmatter.image_url}
                    onSelect={(url) => {
                      updateFrontmatter('image_url', url);
                      setShowBackdropPicker(false);
                      showToast('Backdrop berhasil dipilih!');
                    }}
                    onClose={() => setShowBackdropPicker(false)}
                  />
                )}
              </div>

              {/* Rating, Featured, Duration, Subtitles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Rating (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editingItem.frontmatter.rating || ''}
                    onChange={(e) => updateFrontmatter('rating', Number(e.target.value))}
                    placeholder="8.5"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {editingItem.type === 'tv_episode' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Durasi (e.g. 45m)
                    </label>
                    <input
                      type="text"
                      value={editingItem.frontmatter.duration || ''}
                      onChange={(e) => updateFrontmatter('duration', e.target.value)}
                      placeholder="45m"
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.frontmatter.featured)}
                        onChange={(e) => updateFrontmatter('featured', e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-black/50 border-white/20"
                      />
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> Featured di Hero
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subtitles URL
                  </label>
                  <input
                    type="text"
                    value={editingItem.frontmatter.subtitles || ''}
                    onChange={(e) => updateFrontmatter('subtitles', e.target.value)}
                    placeholder="https://server.com/sub.vtt"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi / Sinopsis (deskripsi)
                </label>
                <textarea
                  rows={3}
                  value={editingItem.frontmatter.deskripsi || editingItem.frontmatter.description || ''}
                  onChange={(e) => updateFrontmatter('deskripsi', e.target.value)}
                  placeholder="Sinopsis singkat..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Markdown Content Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan / Konten Markdown Tambahan
                </label>
                <textarea
                  rows={4}
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder="Konten markdown tambahan..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </>
          ) : (
            /* Episodes list inside TV Series Edit */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white">
                  Daftar Episode ({currentShow?.episodes.length || 0})
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {currentShow?.episodes.map((ep) => (
                  <div
                    key={ep.relativePath}
                    className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300">
                        {ep.seasonFolder || 's1'}/{ep.slug}
                      </span>
                      <span className="font-bold text-white truncate">
                        {ep.displayTitle || ep.frontmatter.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                      {ep.frontmatter.videourl || 'No Video URL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
