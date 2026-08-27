import React from 'react';
import {
  Film,
  Tv,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AdminNavbarProps {
  activeTab: 'movies' | 'tv';
  setActiveTab: (tab: 'movies' | 'tv') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  moviesCount: number;
  tvShowsCount: number;
  totalEpisodesCount: number;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateMovie: () => void;
  onOpenCreateTV: () => void;
  onOpenSettings: () => void;
  hasToken: boolean;
  selectedBatchCount: number;
  onBatchDelete: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  moviesCount,
  tvShowsCount,
  totalEpisodesCount,
  loading,
  onRefresh,
  onOpenCreateMovie,
  onOpenCreateTV,
  onOpenSettings,
  hasToken,
  selectedBatchCount,
  onBatchDelete,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Main Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#090e1f] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                LeviStream CMS Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TinaCMS Aligned
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kelola film, TV series, multi-season episodes, dan metadata TMDB.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedBatchCount > 0 && (
            <button
              onClick={onBatchDelete}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Trash2 size={13} />
              <span>Hapus ({selectedBatchCount})</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-cyan-400' : ''} />
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 ${
              hasToken
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Pengaturan GitHub"
          >
            <Settings size={15} />
            <span className="text-xs font-semibold hidden sm:inline">
              {hasToken ? 'GitHub Terhubung' : 'Setup Token'}
            </span>
          </button>

          <button
            onClick={onOpenCreateMovie}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Plus size={14} />
            <span>Tambah Movie</span>
          </button>

          <button
            onClick={onOpenCreateTV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-500 hover:bg-pink-400 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-pink-500/20 active:scale-95"
          >
            <Plus size={14} />
            <span>Tambah TV Series</span>
          </button>
        </div>
      </div>

      {/* Stats Summary & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#090e1f] rounded-xl border border-white/10 max-w-fit">
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'movies'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film size={14} />
            <span>Movies ({moviesCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'tv'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv size={14} />
            <span>TV Series ({tvShowsCount})</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari ${activeTab === 'movies' ? 'film' : 'series'} (judul, slug, TMDB)...`}
            className="w-full pl-9 pr-3 py-1.5 bg-[#090e1f] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
};
