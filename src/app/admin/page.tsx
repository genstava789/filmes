'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getMovieUrl, getTVUrl, slugify, cleanVideoUrl, extractTmdbIdAndType } from '@/lib/urls';
import {
  Film,
  Tv,
  Plus,
  Minus,
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
  Key,
  ShieldCheck,
  ShieldAlert,
  Layers,
  HelpCircle,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  ImageIcon,
  ListPlus,
  FileText,
  Copy,
} from 'lucide-react';

interface MovieItem {
  filename: string;
  slug: string;
  relativePath: string;
  frontmatter: {
    tmdb_id?: number | string;
    title?: string;
    image_url?: string;
    rating?: number;
    featured?: boolean;
    videourl?: string;
    [key: string]: any;
  };
  content: string;
  posterUrl: string | null;
  displayTitle: string;
  year?: number | null;
  rating?: number | null;
  updatedAt?: number;
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
    image_url?: string;
    rating?: number;
    duration?: string;
    subtitles?: string;
    deskripsi?: string;
    [key: string]: any;
  };
  content: string;
  displayTitle: string;
  posterUrl: string | null;
  updatedAt?: number;
}

interface TVShowItem {
  showSlug: string;
  relativePath: string;
  frontmatter: {
    tmdb_id?: number | string;
    title?: string;
    image_url?: string;
    rating?: number;
    featured?: boolean;
    deskripsi?: string;
    [key: string]: any;
  };
  content: string;
  posterUrl: string | null;
  displayTitle: string;
  year?: number | null;
  rating?: number | null;
  updatedAt?: number;
  episodes: TVEpisodeItem[];
}

interface TMDBBackdropItem {
  filePath: string;
  url: string;
  thumbUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  language: string; // 'xx', 'en', 'id', etc.
  voteAverage: number | null;
  voteCount: number;
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
  backdrops?: TMDBBackdropItem[];
  posters?: TMDBBackdropItem[];
}

interface EpisodeDraft {
  id: string;
  episode: string;
  videourl: string;
  title?: string;
  image_url?: string;
  rating?: string;
  duration?: string;
  subtitles?: string;
  desc?: string;
}

interface SeasonDraft {
  id: string;
  season: string; // e.g. "s1"
  name: string; // e.g. "Season 1"
  episodes: EpisodeDraft[];
}

type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'rating_desc';
type FilterOption = 'all' | 'featured' | 'non_featured';

/**
 * Formats a season slug (e.g. "s1", "s02", "season-3") into a clean display label (e.g. "Season 1", "Season 2", "Season 3").
 */
function formatSeasonLabel(season?: string | null): string {
  if (!season) return 'Season 1';
  const num = season.replace(/\D/g, '');
  return num ? `Season ${parseInt(num, 10)}` : `Season ${season}`;
}

/**
 * Parses episode number from filename or slug (e.g. "e1.md" -> 1, "e02" -> 2, "episode-3" -> 3).
 */
function parseEpisodeNumber(slugOrFilename?: string | null): number | null {
  if (!slugOrFilename) return null;
  const match = slugOrFilename.match(/(?:e|ep|episode|\b)(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  const digits = slugOrFilename.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : null;
}

/**
 * Calculates the next episode number for a given show and season.
 */
function getNextEpisodeNumber(show: TVShowItem | undefined, seasonSlug: string): number {
  if (!show || !show.episodes || show.episodes.length === 0) return 1;
  const targetSeason = seasonSlug.toLowerCase().trim();
  const seasonEps = show.episodes.filter((ep) => {
    const epSeason = (ep.seasonFolder || 's1').toLowerCase().trim();
    return epSeason === targetSeason || epSeason.replace(/\D/g, '') === targetSeason.replace(/\D/g, '');
  });
  if (seasonEps.length === 0) return 1;

  let maxEp = 0;
  for (const ep of seasonEps) {
    const num = parseEpisodeNumber(ep.slug) || parseEpisodeNumber(ep.filename);
    if (num && num > maxEp) {
      maxEp = num;
    }
  }
  return maxEp + 1;
}

/**
 * Gets all unique season slugs for a given show (e.g. ["s1", "s2"]), sorted.
 */
function getShowSeasons(show: TVShowItem | undefined): string[] {
  if (!show || !show.episodes || show.episodes.length === 0) return ['s1'];
  const seasonsSet = new Set<string>();
  show.episodes.forEach((ep) => {
    if (ep.seasonFolder) {
      seasonsSet.add(ep.seasonFolder.toLowerCase());
    } else {
      seasonsSet.add('s1');
    }
  });
  const seasons = Array.from(seasonsSet);
  if (seasons.length === 0) return ['s1'];
  seasons.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });
  return seasons;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [tvShows, setTvShows] = useState<TVShowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // GitHub Token & Hydration Safety (Fixes Flicker)
  const [githubToken, setGithubToken] = useState<string>('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: 'movie' | 'tv_show' | 'tv_episode';
    relativePath: string;
    frontmatter: Record<string, any>;
    content: string;
  } | null>(null);

  // Form State for Creation & Validation Errors
  const [contentType, setContentType] = useState<'movie' | 'tv_show'>('movie');
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

  // Multi-Season & Multi-Episode State for TV Series (Create Form)
  const [formSeasons, setFormSeasons] = useState<SeasonDraft[]>([
    {
      id: 'season-1',
      season: 's1',
      name: 'Season 1',
      episodes: [{ id: 'ep-1-1', episode: '1', videourl: '', title: '' }],
    },
  ]);
  const [activeSeasonTab, setActiveSeasonTab] = useState<string>('s1');
  const [batchUrlsInput, setBatchUrlsInput] = useState('');
  const [showBatchUrlInput, setShowBatchUrlInput] = useState(false);

  // Edit Modal State for TV Shows
  const [editShowTab, setEditShowTab] = useState<'info' | 'episodes'>('info');
  const [editActiveSeasonTab, setEditActiveSeasonTab] = useState<string>('s1');
  const [editBatchUrlsInput, setEditBatchUrlsInput] = useState('');
  const [showEditBatchUrlInput, setShowEditBatchUrlInput] = useState(false);

  // Active episode image picker draft tracker
  const [activeEpisodePickerDraftId, setActiveEpisodePickerDraftId] = useState<string | null>(null);

  // Form Validation Touched & Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Live TMDB Preview & Backdrop Picker State for Create Modal
  const [tmdbPreview, setTmdbPreview] = useState<TMDBPreviewData | null>(null);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);
  const [selectedBackdropLang, setSelectedBackdropLang] = useState<string>('all');
  const [showBackdropPicker, setShowBackdropPicker] = useState(false);

  // Live TMDB Preview & Backdrop Picker State for Edit Modal
  const [editTmdbPreview, setEditTmdbPreview] = useState<TMDBPreviewData | null>(null);
  const [fetchingEditTmdb, setFetchingEditTmdb] = useState(false);
  const [editSelectedBackdropLang, setEditSelectedBackdropLang] = useState<string>('all');
  const [showEditBackdropPicker, setShowEditBackdropPicker] = useState(false);

  // Detect duplicate existing post when creating
  const existingDuplicate = useMemo(() => {
    if (contentType === 'movie') {
      const extracted = extractTmdbIdAndType(formTmdbId);
      const idNum = extracted.id ? Number(extracted.id) : null;
      if (!idNum && !formSlug.trim()) return null;
      return (
        movies.find((m) => {
          const matchId = idNum && Number(m.frontmatter.tmdb_id) === idNum;
          const matchSlug =
            formSlug.trim() && (m.slug === slugify(formSlug) || m.filename === `${slugify(formSlug)}.md`);
          return matchId || matchSlug;
        }) || null
      );
    }
    if (contentType === 'tv_show') {
      const extracted = extractTmdbIdAndType(formTmdbId);
      const idNum = extracted.id ? Number(extracted.id) : null;
      const cleanSlug = formSlug.trim() ? slugify(formSlug) : formTitle.trim() ? slugify(formTitle) : null;
      if (!idNum && !cleanSlug) return null;
      return (
        tvShows.find((s) => {
          const matchId = idNum && Number(s.frontmatter.tmdb_id) === idNum;
          const matchSlug = cleanSlug && s.showSlug === cleanSlug;
          return matchId || matchSlug;
        }) || null
      );
    }
    return null;
  }, [contentType, formTmdbId, formSlug, formTitle, movies, tvShows]);

  // Load saved token & optimistic cache from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('levistream_github_token') || '';
      setGithubToken(saved);
      setTempToken(saved);

      const cachedMovies = localStorage.getItem('cms_cached_movies');
      const cachedTV = localStorage.getItem('cms_cached_tv');
      if (cachedMovies) setMovies(JSON.parse(cachedMovies));
      if (cachedTV) setTvShows(JSON.parse(cachedTV));
    } catch {
      // ignore
    } finally {
      setTokenChecked(true);
    }
  }, []);

  const saveToken = () => {
    if (!tempToken.trim()) {
      showToast('Token tidak boleh kosong', 'warning');
      return;
    }
    localStorage.setItem('levistream_github_token', tempToken.trim());
    setGithubToken(tempToken.trim());
    setIsSettingsOpen(false);
    showToast('GitHub Token berhasil disimpan & aktif!');
  };

  const removeToken = () => {
    localStorage.removeItem('levistream_github_token');
    setGithubToken('');
    setTempToken('');
    showToast('GitHub Token telah dihapus', 'warning');
  };

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (githubToken) {
      headers['x-github-token'] = githubToken;
    }
    return headers;
  }, [githubToken]);

  const requireToken = (actionName: string): boolean => {
    if (!githubToken) {
      setIsSettingsOpen(true);
      showToast(`Token GitHub diperlukan untuk ${actionName}. Masukkan token di bawah ini.`, 'warning');
      return false;
    }
    return true;
  };

  // Fetch content list from API
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content', {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.movies) {
        setMovies(data.movies);
        try {
          localStorage.setItem('cms_cached_movies', JSON.stringify(data.movies));
        } catch {}
      }
      if (data.tvShows) {
        setTvShows(data.tvShows);
        try {
          localStorage.setItem('cms_cached_tv', JSON.stringify(data.tvShows));
        } catch {}
      }
    } catch (e) {
      showToast('Gagal memuat konten dari server', 'error');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // TMDB Autofetch for Edit Modal
  const handleFetchEditTmdbPreview = async (idOrUrl: string, type: 'movie' | 'tv') => {
    const extracted = extractTmdbIdAndType(idOrUrl);
    if (!extracted.id) return;
    setFetchingEditTmdb(true);
    try {
      const res = await fetch(`/api/admin/tmdb-preview?id=${extracted.id}&type=${extracted.type || type}`);
      const data = await res.json();
      if (res.ok) {
        setEditTmdbPreview(data);
      }
    } catch (e) {
      console.warn('Error fetching TMDB preview for edit modal:', e);
    } finally {
      setFetchingEditTmdb(false);
    }
  };

  // Open Edit Modal with fresh state (with TV show TMDB ID lookup for episodes)
  const openEditModal = (item: {
    type: 'movie' | 'tv_show' | 'tv_episode';
    relativePath: string;
    frontmatter: Record<string, any>;
    content: string;
  }) => {
    setEditingItem(item);
    setEditErrors({});
    setEditTmdbPreview(null);
    setShowEditBackdropPicker(false);
    setEditSelectedBackdropLang('all');
    setEditShowTab('info');
    setIsEditModalOpen(true);

    let tmdbIdToFetch = item.frontmatter.tmdb_id;
    if (!tmdbIdToFetch && item.type === 'tv_episode') {
      const showSlug = item.relativePath.split('/')[1];
      const show = tvShows.find((s) => s.showSlug === showSlug);
      tmdbIdToFetch = show?.frontmatter.tmdb_id;
    }

    if (tmdbIdToFetch) {
      handleFetchEditTmdbPreview(String(tmdbIdToFetch), item.type === 'movie' ? 'movie' : 'tv');
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Reset page when tab, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy, filterBy]);

  // TMDB Autofetch preview with support for pure IDs and full TMDB URLs
  const handleFetchTmdbPreview = async (idOrUrl: string, type: 'movie' | 'tv') => {
    const extracted = extractTmdbIdAndType(idOrUrl);
    if (!extracted.id) {
      setFormErrors((prev) => ({ ...prev, tmdb_id: 'Masukkan TMDB ID angka atau URL TMDB yang valid' }));
      return;
    }
    const cleanId = extracted.id;
    const targetType = extracted.type || type;
    if (extracted.type && extracted.type === 'tv' && contentType === 'movie') {
      setContentType('tv_show');
    } else if (extracted.type && extracted.type === 'movie' && contentType === 'tv_show') {
      setContentType('movie');
    }

    setFormTmdbId(cleanId);
    setFetchingTmdb(true);
    try {
      const res = await fetch(`/api/admin/tmdb-preview?id=${cleanId}&type=${targetType}`);
      const data = await res.json();
      if (res.ok) {
        setTmdbPreview(data);
        if (!formTitle || formTitle === formTmdbId) setFormTitle(data.title);
        if (!formDesc) setFormDesc(data.overview);
        if (!formPoster) setFormPoster(data.posterUrl);
        if (!formRating) setFormRating(String(data.rating || ''));
        if (data.title && !formSlug) {
          const autoSlug = slugify(data.title);
          if (data.year) setFormSlug(`${autoSlug}-${data.year}`);
          else setFormSlug(autoSlug);
        }

        // Initialize multiple seasons if TV Show has multiple seasons in TMDB
        if (targetType === 'tv' && data.numberOfSeasons && data.numberOfSeasons > 0) {
          const newSeasons: SeasonDraft[] = [];
          const seasonCount = Math.min(data.numberOfSeasons, 12);
          for (let sIdx = 1; sIdx <= seasonCount; sIdx++) {
            newSeasons.push({
              id: `season-${sIdx}-${Date.now()}`,
              season: `s${sIdx}`,
              name: `Season ${sIdx}`,
              episodes: [
                {
                  id: `ep-${sIdx}-1-${Date.now()}`,
                  episode: '1',
                  videourl: '',
                  title: '',
                },
              ],
            });
          }
          setFormSeasons(newSeasons);
          setActiveSeasonTab('s1');
        }

        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.tmdb_id;
          return next;
        });
        showToast('Data TMDB berhasil diambil!', 'success');
      } else {
        setFormErrors((prev) => ({ ...prev, tmdb_id: data.error || 'TMDB ID tidak ditemukan' }));
      }
    } catch (e) {
      setFormErrors((prev) => ({ ...prev, tmdb_id: 'Gagal mengambil data dari TMDB API' }));
    } finally {
      setFetchingTmdb(false);
    }
  };

  const handleTmdbIdInputChange = (val: string) => {
    if (val.includes('themoviedb.org') || val.includes('/movie/') || val.includes('/tv/')) {
      const extracted = extractTmdbIdAndType(val);
      if (extracted.id) {
        setFormTmdbId(extracted.id);
        const autoType = extracted.type || (contentType === 'movie' ? 'movie' : 'tv');
        handleFetchTmdbPreview(extracted.id, autoType);
        return;
      }
    }
    setFormTmdbId(val);
    if (val) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.tmdb_id;
        return next;
      });
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
    setFormErrors({});
    setTmdbPreview(null);
    setShowBackdropPicker(false);
    setSelectedBackdropLang('all');
    setFormSeasons([
      {
        id: 'season-1',
        season: 's1',
        name: 'Season 1',
        episodes: [{ id: 'ep-1-1', episode: '1', videourl: '', title: '' }],
      },
    ]);
    setActiveSeasonTab('s1');
    setBatchUrlsInput('');
    setShowBatchUrlInput(false);
    setActiveEpisodePickerDraftId(null);
  };

  // Season & Episode Draft Handlers for Create TV Series
  const addSeason = () => {
    setFormSeasons((prev) => {
      let maxNum = 0;
      prev.forEach((s) => {
        const num = parseInt(s.season.replace(/\D/g, '') || '0', 10);
        if (num > maxNum) maxNum = num;
      });
      const nextNum = maxNum + 1;
      const nextSeasonSlug = `s${nextNum}`;
      const newSeason: SeasonDraft = {
        id: `season-${nextNum}-${Date.now()}`,
        season: nextSeasonSlug,
        name: `Season ${nextNum}`,
        episodes: [{ id: `ep-${nextNum}-1-${Date.now()}`, episode: '1', videourl: '', title: '' }],
      };
      setActiveSeasonTab(nextSeasonSlug);
      return [...prev, newSeason];
    });
  };

  const removeSeason = (seasonSlug: string) => {
    if (formSeasons.length <= 1) {
      showToast('TV Series minimal harus memiliki 1 season', 'warning');
      return;
    }
    setFormSeasons((prev) => {
      const filtered = prev.filter((s) => s.season !== seasonSlug);
      if (activeSeasonTab === seasonSlug) {
        setActiveSeasonTab(filtered[0]?.season || 's1');
      }
      return filtered;
    });
  };

  const addEpisodeToSeason = (seasonSlug: string) => {
    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.season !== seasonSlug) return s;
        let maxEp = 0;
        s.episodes.forEach((ep) => {
          const num = parseInt(ep.episode.replace(/\D/g, '') || '0', 10);
          if (num > maxEp) maxEp = num;
        });
        const nextEpNum = maxEp + 1;
        const newEp: EpisodeDraft = {
          id: `ep-${s.season}-${nextEpNum}-${Date.now()}`,
          episode: String(nextEpNum),
          videourl: '',
          title: '',
        };
        return {
          ...s,
          episodes: [...s.episodes, newEp],
        };
      })
    );
  };

  const removeEpisodeFromSeason = (seasonSlug: string, epId: string) => {
    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.season !== seasonSlug) return s;
        if (s.episodes.length <= 1) {
          showToast('Season minimal harus memiliki 1 episode', 'warning');
          return s;
        }
        return {
          ...s,
          episodes: s.episodes.filter((ep) => ep.id !== epId),
        };
      })
    );
  };

  const updateEpisodeInSeason = (
    seasonSlug: string,
    epId: string,
    field: keyof EpisodeDraft,
    value: string
  ) => {
    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.season !== seasonSlug) return s;
        return {
          ...s,
          episodes: s.episodes.map((ep) => (ep.id === epId ? { ...ep, [field]: value } : ep)),
        };
      })
    );
  };

  const handleQuickGenerateEpisodes = (seasonSlug: string, count: number) => {
    if (count <= 0) return;
    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.season !== seasonSlug) return s;
        let maxEp = 0;
        s.episodes.forEach((ep) => {
          const num = parseInt(ep.episode.replace(/\D/g, '') || '0', 10);
          if (num > maxEp) maxEp = num;
        });
        const newEpisodes: EpisodeDraft[] = [];
        for (let i = 1; i <= count; i++) {
          const epNum = maxEp + i;
          newEpisodes.push({
            id: `ep-${s.season}-${epNum}-${Date.now()}-${i}`,
            episode: String(epNum),
            videourl: '',
            title: '',
          });
        }
        return {
          ...s,
          episodes: [...s.episodes, ...newEpisodes],
        };
      })
    );
    showToast(`Berhasil menambahkan ${count} episode ke ${formatSeasonLabel(seasonSlug)}!`, 'success');
  };

  const handleBatchPasteUrls = (seasonSlug: string) => {
    const lines = batchUrlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast('Masukkan minimal 1 URL video', 'warning');
      return;
    }

    setFormSeasons((prev) =>
      prev.map((s) => {
        if (s.season !== seasonSlug) return s;
        let maxEp = 0;
        s.episodes.forEach((ep) => {
          const num = parseInt(ep.episode.replace(/\D/g, '') || '0', 10);
          if (num > maxEp) maxEp = num;
        });

        const hasSingleEmpty = s.episodes.length === 1 && !s.episodes[0].videourl.trim();
        const baseEpisodes = hasSingleEmpty ? [] : [...s.episodes];
        const startNum = hasSingleEmpty ? 0 : maxEp;

        const generated: EpisodeDraft[] = lines.map((url, idx) => ({
          id: `ep-${s.season}-${startNum + idx + 1}-${Date.now()}-${idx}`,
          episode: String(startNum + idx + 1),
          videourl: cleanVideoUrl(url) || url,
          title: '',
        }));

        return {
          ...s,
          episodes: [...baseEpisodes, ...generated],
        };
      })
    );

    setBatchUrlsInput('');
    setShowBatchUrlInput(false);
    showToast(`Berhasil menambahkan ${lines.length} episode dari URL yang ditempel!`, 'success');
  };

  // Validate create form
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const extracted = extractTmdbIdAndType(formTmdbId);
    if (!formTmdbId.trim()) {
      errors.tmdb_id = 'TMDB ID wajib diisi!';
    } else if (!extracted.id) {
      errors.tmdb_id = 'TMDB ID harus berupa angka atau URL TMDB yang valid!';
    }

    if (contentType === 'movie') {
      if (!formVideoUrl.trim()) {
        errors.videourl = 'URL Video wajib diisi!';
      }
    }

    if (contentType === 'tv_show') {
      const validEpisodes = formSeasons.reduce(
        (acc, s) => acc + s.episodes.filter((ep) => ep.videourl.trim()).length,
        0
      );
      if (validEpisodes === 0) {
        errors.episodes = 'Masukkan minimal 1 URL Video untuk episode!';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create with Instant Optimistic Preview & Multi-Season Support
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCreateForm()) {
      showToast('Mohon lengkapi semua field yang wajib diisi (bergaris merah)', 'error');
      return;
    }

    if (!requireToken('membuat konten')) return;

    const extracted = extractTmdbIdAndType(formTmdbId);
    const tmdbIdNum = extracted.id ? Number(extracted.id) : undefined;
    const cleanVideo = cleanVideoUrl(formVideoUrl) || formVideoUrl.trim();

    const payload: any = {
      contentType,
      tmdb_id: tmdbIdNum,
      videourl: cleanVideo,
      title: formTitle.trim() || undefined,
      desc: formDesc.trim() || undefined,
      poster: formPoster.trim() || undefined,
      rating: formRating ? Number(formRating) : undefined,
      featured: formFeatured,
      subtitles: formSubtitles.trim() || undefined,
      slug: formSlug.trim() || undefined,
      duration: formDuration.trim() || undefined,
      seasons: formSeasons,
    };

    // 1. Instant update in local state - Place at the very top (index 0)
    if (contentType === 'movie') {
      const posterImg = payload.poster || tmdbPreview?.posterUrl || null;
      const formattedPoster = posterImg ? (posterImg.startsWith('http') ? posterImg : `https://image.tmdb.org/t/p/w500${posterImg}`) : null;
      const optimisticMovie: MovieItem = {
        filename: `${payload.slug || formTitle.toLowerCase().replace(/\s+/g, '-') || `movie-${payload.tmdb_id}`}.md`,
        slug: payload.slug || formTitle.toLowerCase().replace(/\s+/g, '-') || `movie-${payload.tmdb_id}`,
        relativePath: `video/${payload.slug || formTitle.toLowerCase().replace(/\s+/g, '-') || `movie-${payload.tmdb_id}`}.md`,
        frontmatter: {
          tmdb_id: payload.tmdb_id,
          title: payload.title || tmdbPreview?.title,
          videourl: payload.videourl,
          image_url: payload.poster || tmdbPreview?.posterUrl || undefined,
          rating: payload.rating || tmdbPreview?.rating || undefined,
          featured: Boolean(payload.featured),
        },
        content: '',
        posterUrl: formattedPoster,
        displayTitle: payload.title || tmdbPreview?.title || `Movie ${payload.tmdb_id}`,
        year: tmdbPreview?.year || new Date().getFullYear(),
        rating: payload.rating || tmdbPreview?.rating || null,
        updatedAt: Date.now(),
      };
      setMovies((prev) => [optimisticMovie, ...prev.filter((m) => m.relativePath !== optimisticMovie.relativePath)]);
    } else if (contentType === 'tv_show') {
      const showSlugTarget = formSlug || slugify(formTitle || tmdbPreview?.title || `tv-${tmdbIdNum}`);
      const optimisticEpisodes: TVEpisodeItem[] = [];

      formSeasons.forEach((seasonDraft) => {
        const cleanSeason = seasonDraft.season.toLowerCase().startsWith('s')
          ? seasonDraft.season.toLowerCase()
          : `s${seasonDraft.season.replace(/\D/g, '') || '1'}`;

        seasonDraft.episodes.forEach((ep) => {
          const cleanEpNum = ep.episode.replace(/\D/g, '') || '1';
          const cleanEp = `e${cleanEpNum}`;
          const cleanEpVideo = cleanVideoUrl(ep.videourl) || ep.videourl.trim();

          if (cleanEpVideo) {
            optimisticEpisodes.push({
              showSlug: showSlugTarget,
              seasonFolder: cleanSeason,
              filename: `${cleanEp}.md`,
              slug: cleanEp,
              relativePath: `tv/${showSlugTarget}/${cleanSeason}/${cleanEp}.md`,
              frontmatter: {
                title: ep.title || undefined,
                videourl: cleanEpVideo,
                image_url: ep.image_url || undefined,
                rating: ep.rating ? Number(ep.rating) : undefined,
                duration: ep.duration || undefined,
                subtitles: ep.subtitles || undefined,
                deskripsi: ep.desc || undefined,
              },
              content: '',
              displayTitle: ep.title || `Episode ${cleanEpNum}`,
              posterUrl: ep.image_url || formPoster || tmdbPreview?.posterUrl || null,
              updatedAt: Date.now(),
            });
          }
        });
      });

      const posterImg = payload.poster || tmdbPreview?.posterUrl || null;
      const formattedPoster = posterImg ? (posterImg.startsWith('http') ? posterImg : `https://image.tmdb.org/t/p/w500${posterImg}`) : null;

      const optimisticTVShow: TVShowItem = {
        showSlug: showSlugTarget,
        relativePath: `tv/${showSlugTarget}/_index.md`,
        frontmatter: {
          tmdb_id: tmdbIdNum,
          title: payload.title || tmdbPreview?.title,
          image_url: payload.poster || tmdbPreview?.posterUrl || undefined,
          rating: payload.rating || tmdbPreview?.rating || undefined,
          featured: Boolean(payload.featured),
          deskripsi: payload.desc || tmdbPreview?.overview || undefined,
        },
        content: '',
        posterUrl: formattedPoster,
        displayTitle: payload.title || tmdbPreview?.title || `TV Show ${payload.tmdb_id}`,
        year: tmdbPreview?.year || new Date().getFullYear(),
        rating: payload.rating || tmdbPreview?.rating || null,
        episodes: optimisticEpisodes,
        updatedAt: Date.now(),
      };

      setTvShows((prev) => [optimisticTVShow, ...prev.filter((s) => s.showSlug !== showSlugTarget)]);
    }

    setIsCreateModalOpen(false);
    resetCreateForm();
    showToast('Menyimpan ke GitHub & memperbarui halaman...', 'success');

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        if (result.isUpdate) {
          if (result.hasChanges && result.changedFields?.length > 0) {
            showToast(
              `Post sudah ada. Berhasil memperbarui: ${result.changedFields.join(', ')}!`,
              'success'
            );
          } else {
            showToast(`Post ini sudah ada (data tetap sama).`, 'warning');
          }
        } else {
          showToast(
            result.savedEpisodesCount
              ? `Berhasil membuat TV Series dan ${result.savedEpisodesCount} episode!`
              : `Berhasil membuat post baru: ${result.relativePath}`,
            'success'
          );
        }
        setTmdbPreview(null);
        fetchContent();
      } else {
        if (result.requiresToken) {
          setIsSettingsOpen(true);
        }
        showToast(result.error || 'Gagal membuat konten', 'error');
        fetchContent();
      }
    } catch (e: any) {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  // Validate edit form
  const validateEditForm = (): boolean => {
    if (!editingItem) return false;
    const errors: Record<string, string> = {};

    if (editingItem.type !== 'tv_episode') {
      const id = String(editingItem.frontmatter.tmdb_id || '').trim();
      const ext = extractTmdbIdAndType(id);
      if (!id) {
        errors.tmdb_id = 'TMDB ID wajib diisi!';
      } else if (!ext.id) {
        errors.tmdb_id = 'TMDB ID harus berupa angka atau URL TMDB yang valid!';
      }
    }

    if (editingItem.type !== 'tv_show') {
      const video = (editingItem.frontmatter.videourl || editingItem.frontmatter.video_url || '').trim();
      if (!video) {
        errors.videourl = 'URL Video wajib diisi!';
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Edit with instant update and moving the modified post to the top
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!validateEditForm()) {
      showToast('Mohon periksa field wajib (bergaris merah)', 'error');
      return;
    }

    if (!requireToken('mengedit konten')) return;

    const imgVal = editingItem.frontmatter.image_url || editingItem.frontmatter.poster_path || null;
    const formattedPoster = imgVal ? (imgVal.startsWith('http') ? imgVal : `https://image.tmdb.org/t/p/w500${imgVal}`) : null;

    // Instant local state update & move edited post to index 0 (top of list)
    if (editingItem.type === 'movie') {
      setMovies((prev) => {
        const existing = prev.find((m) => m.relativePath === editingItem.relativePath);
        const updatedMovie: MovieItem = {
          filename: existing ? existing.filename : editingItem.relativePath.replace(/^video\//, ''),
          slug: existing ? existing.slug : editingItem.relativePath.replace(/^video\//, '').replace(/\.(md|markdown)$/i, ''),
          relativePath: editingItem.relativePath,
          frontmatter: {
            ...editingItem.frontmatter,
            featured: Boolean(editingItem.frontmatter.featured),
          },
          content: editingItem.content || '',
          displayTitle: editingItem.frontmatter.title || existing?.displayTitle,
          posterUrl: formattedPoster || existing?.posterUrl,
          rating: editingItem.frontmatter.rating ? Number(editingItem.frontmatter.rating) : existing?.rating,
          year: existing?.year,
          updatedAt: Date.now(),
        };
        return [updatedMovie, ...prev.filter((m) => m.relativePath !== editingItem.relativePath)];
      });
    } else if (editingItem.type === 'tv_show') {
      setTvShows((prev) => {
        const existing = prev.find(
          (s) => s.relativePath === editingItem.relativePath || s.showSlug === editingItem.relativePath.split('/')[1]
        );
        const updatedShow: TVShowItem = {
          showSlug: existing ? existing.showSlug : editingItem.relativePath.split('/')[1],
          relativePath: editingItem.relativePath,
          frontmatter: {
            ...editingItem.frontmatter,
            featured: Boolean(editingItem.frontmatter.featured),
          },
          content: editingItem.content || '',
          displayTitle: editingItem.frontmatter.title || existing?.displayTitle,
          posterUrl: formattedPoster || existing?.posterUrl,
          rating: editingItem.frontmatter.rating ? Number(editingItem.frontmatter.rating) : existing?.rating,
          year: existing?.year,
          updatedAt: Date.now(),
          episodes: existing ? existing.episodes : [],
        };
        return [updatedShow, ...prev.filter((s) => s.showSlug !== updatedShow.showSlug)];
      });
    } else if (editingItem.type === 'tv_episode') {
      setTvShows((prev) => {
        const showSlug = editingItem.relativePath.split('/')[1];
        const targetShow = prev.find((s) => s.showSlug === showSlug);
        if (!targetShow) return prev;
        const updatedEpisodes = targetShow.episodes.map((ep) =>
          ep.relativePath === editingItem.relativePath
            ? {
                ...ep,
                frontmatter: { ...editingItem.frontmatter },
                displayTitle: editingItem.frontmatter.title || ep.displayTitle,
                posterUrl: formattedPoster || ep.posterUrl,
                updatedAt: Date.now(),
              }
            : ep
        );
        const updatedShow: TVShowItem = {
          ...targetShow,
          episodes: updatedEpisodes,
          updatedAt: Date.now(),
        };
        return [updatedShow, ...prev.filter((s) => s.showSlug !== targetShow.showSlug)];
      });
    }

    setIsEditModalOpen(false);
    setEditTmdbPreview(null);
    setShowEditBackdropPicker(false);
    showToast('Menyimpan perubahan...', 'success');

    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          relativePath: editingItem.relativePath,
          frontmatter: editingItem.frontmatter,
          content: editingItem.content,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showToast(`Perubahan berhasil disimpan & live!`);
        setEditingItem(null);
        setEditErrors({});
        setEditTmdbPreview(null);
        fetchContent();
      } else {
        if (result.requiresToken) {
          setIsSettingsOpen(true);
        }
        showToast(result.error || 'Gagal menyimpan perubahan', 'error');
        fetchContent();
      }
    } catch (e) {
      showToast('Gagal menyimpan perubahan', 'error');
    }
  };

  // Delete Content
  const handleDelete = async (relativePath: string, label: string) => {
    if (!requireToken('menghapus konten')) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus "${label}" (${relativePath})? Tindakan ini permanen.`)) return;

    // Optimistic delete
    setMovies((prev) => prev.filter((m) => m.relativePath !== relativePath));
    setTvShows((prev) =>
      prev
        .map((s) => ({
          ...s,
          episodes: s.episodes.filter((ep) => ep.relativePath !== relativePath),
        }))
        .filter((s) => s.relativePath !== relativePath && (relativePath.endsWith('_index.md') ? s.relativePath !== relativePath : true))
    );

    try {
      const res = await fetch(`/api/admin/content?path=${encodeURIComponent(relativePath)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Berhasil menghapus: ${label}`);
        fetchContent();
      } else {
        if (data.requiresToken) setIsSettingsOpen(true);
        showToast(data.error || 'Gagal menghapus konten', 'error');
        fetchContent();
      }
    } catch (e) {
      showToast('Gagal menghapus konten', 'error');
    }
  };

  // Quick Add New Episode to existing show in Edit Modal
  const handleQuickAddEpisodeToEditShow = (show: TVShowItem, seasonSlug: string) => {
    const nextEpNum = getNextEpisodeNumber(show, seasonSlug);
    const cleanSeason = seasonSlug.toLowerCase().startsWith('s') ? seasonSlug.toLowerCase() : `s${seasonSlug.replace(/\D/g, '') || '1'}`;
    const cleanEp = `e${nextEpNum}`;

    openEditModal({
      type: 'tv_episode',
      relativePath: `tv/${show.showSlug}/${cleanSeason}/${cleanEp}.md`,
      frontmatter: {
        title: `Episode ${nextEpNum}`,
        videourl: '',
      },
      content: '',
    });
  };

  // Batch paste URLs for existing show in Edit Modal
  const handleEditShowBatchPasteUrls = async (show: TVShowItem, seasonSlug: string) => {
    const lines = editBatchUrlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast('Masukkan minimal 1 URL video', 'warning');
      return;
    }

    if (!requireToken('menambahkan batch episode')) return;

    const cleanSeason = seasonSlug.toLowerCase().startsWith('s') ? seasonSlug.toLowerCase() : `s${seasonSlug.replace(/\D/g, '') || '1'}`;
    const startNum = getNextEpisodeNumber(show, cleanSeason);

    showToast(`Menyimpan ${lines.length} episode baru ke ${formatSeasonLabel(cleanSeason)}...`, 'success');

    const generatedEpisodes = lines.map((url, idx) => ({
      episode: String(startNum + idx),
      videourl: cleanVideoUrl(url) || url,
      title: `Episode ${startNum + idx}`,
    }));

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          contentType: 'tv_show',
          tmdb_id: show.frontmatter.tmdb_id,
          showSlug: show.showSlug,
          seasons: [
            {
              season: cleanSeason,
              episodes: generatedEpisodes,
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Berhasil menambahkan ${lines.length} episode baru!`, 'success');
        setEditBatchUrlsInput('');
        setShowEditBatchUrlInput(false);
        fetchContent();
      } else {
        showToast(data.error || 'Gagal menambahkan episode', 'error');
      }
    } catch {
      showToast('Gagal memproses penambahan episode', 'error');
    }
  };

  // Filter & Sort Logic for Movies
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          (m.displayTitle && m.displayTitle.toLowerCase().includes(q)) ||
          (m.frontmatter.title && m.frontmatter.title.toLowerCase().includes(q)) ||
          (m.frontmatter.tmdb_id && String(m.frontmatter.tmdb_id).includes(q)) ||
          m.slug.toLowerCase().includes(q)
      );
    }

    if (filterBy === 'featured') {
      result = result.filter((m) => Boolean(m.frontmatter.featured));
    } else if (filterBy === 'non_featured') {
      result = result.filter((m) => !m.frontmatter.featured);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortBy === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sortBy === 'title_asc') return (a.displayTitle || '').localeCompare(b.displayTitle || '');
      if (sortBy === 'title_desc') return (b.displayTitle || '').localeCompare(a.displayTitle || '');
      if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

    return result;
  }, [movies, searchQuery, filterBy, sortBy]);

  // Filter & Sort Logic for TV Shows
  const filteredTvShows = useMemo(() => {
    let result = [...tvShows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.displayTitle && s.displayTitle.toLowerCase().includes(q)) ||
          (s.frontmatter.title && s.frontmatter.title.toLowerCase().includes(q)) ||
          (s.frontmatter.tmdb_id && String(s.frontmatter.tmdb_id).includes(q)) ||
          s.showSlug.toLowerCase().includes(q) ||
          s.episodes.some((ep) => ep.displayTitle.toLowerCase().includes(q) || ep.slug.toLowerCase().includes(q))
      );
    }

    if (filterBy === 'featured') {
      result = result.filter((s) => Boolean(s.frontmatter.featured));
    } else if (filterBy === 'non_featured') {
      result = result.filter((s) => !s.frontmatter.featured);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortBy === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sortBy === 'title_asc') return (a.displayTitle || '').localeCompare(b.displayTitle || '');
      if (sortBy === 'title_desc') return (b.displayTitle || '').localeCompare(a.displayTitle || '');
      if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

    return result;
  }, [tvShows, searchQuery, filterBy, sortBy]);

  // Pagination calculation
  const totalItems = activeTab === 'movies' ? filteredMovies.length : filteredTvShows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedMovies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovies.slice(start, start + itemsPerPage);
  }, [filteredMovies, currentPage, itemsPerPage]);

  const paginatedTvShows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTvShows.slice(start, start + itemsPerPage);
  }, [filteredTvShows, currentPage, itemsPerPage]);

  // Active TV Show being edited (if editing tv_show)
  const currentEditingShow = useMemo(() => {
    if (!editingItem) return null;
    if (editingItem.type === 'tv_show') {
      return (
        tvShows.find(
          (s) => s.relativePath === editingItem.relativePath || s.showSlug === editingItem.relativePath.split('/')[1]
        ) || null
      );
    }
    return null;
  }, [editingItem, tvShows]);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 pb-20 selection:bg-cyan-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up border ${
            toastMessage.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-500/50'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50'
              : 'bg-cyan-950/90 text-cyan-200 border-cyan-500/50'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : toastMessage.type === 'warning' ? (
            <AlertCircle size={18} className="text-amber-400" />
          ) : (
            <CheckCircle size={18} className="text-cyan-400" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070913]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Filmes Admin Panel
              </h1>
              <p className="text-xs text-slate-400">Content Management & Live Post Publisher</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* GitHub Token Status Badge */}
            {tokenChecked && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                  githubToken
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:border-amber-400 animate-pulse'
                }`}
                title="Klik untuk konfigurasi GitHub Token"
              >
                {githubToken ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{githubToken ? 'GitHub PAT Aktif' : 'Token Belum Terpasang'}</span>
              </button>
            )}

            <button
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              <span>Tambah Post Baru</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {/* Navigation Tabs (Movies / TV Series) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('movies')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'movies'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Film size={16} />
              <span>Movies ({movies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tv')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'tv'
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Tv size={16} />
              <span>TV Series ({tvShows.length})</span>
            </button>
          </div>

          <button
            onClick={fetchContent}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-2 text-xs font-semibold transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6">
          <div className="sm:col-span-6 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari ${activeTab === 'movies' ? 'Movie' : 'TV Series'} berdasarkan judul atau TMDB ID...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c1224] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="sm:col-span-3">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0c1224] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="all">Semua Konten</option>
                <option value="featured">Hanya Featured (Homepage)</option>
                <option value="non_featured">Bukan Featured</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <div className="relative">
              <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0c1224] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="newest">Paling Baru Diperbarui</option>
                <option value="oldest">Paling Lama</option>
                <option value="title_asc">Judul (A - Z)</option>
                <option value="title_desc">Judul (Z - A)</option>
                <option value="rating_desc">Rating Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content List: Movies Tab */}
        {activeTab === 'movies' && (
          loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-cyan-400" />
              <p className="text-sm">Memuat daftar movie...</p>
            </div>
          ) : paginatedMovies.length === 0 ? (
            <div className="py-20 text-center bg-[#0c1224] rounded-2xl border border-white/5">
              <Film size={40} className="mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-white mb-1">Belum Ada Movie Ditemukan</h3>
              <p className="text-xs text-slate-400 mb-4">
                {searchQuery ? 'Tidak ada hasil untuk pencarian Anda.' : 'Mulai tambahkan movie baru ke sistem.'}
              </p>
              <button
                onClick={() => {
                  resetCreateForm();
                  setContentType('movie');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white transition-all"
              >
                <Plus size={16} />
                <span>Tambah Movie Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedMovies.map((movie) => {
                const title = movie.displayTitle || movie.frontmatter.title || movie.slug;
                const tmdbId = movie.frontmatter.tmdb_id;
                const poster = movie.posterUrl || movie.frontmatter.image_url;
                const isFeatured = Boolean(movie.frontmatter.featured);
                const rating = movie.rating || movie.frontmatter.rating;

                return (
                  <div
                    key={movie.relativePath}
                    className="p-4 rounded-2xl bg-[#0c1224] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-lg shadow-black/20"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="relative w-16 h-24 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10 shadow-md">
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
                              TMDB {tmdbId || 'N/A'}
                            </span>
                            {isFeatured && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> Featured
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2" title={title}>
                            {title} {movie.year ? <span className="text-slate-400 font-normal">({movie.year})</span> : ''}
                          </h3>

                          {rating ? (
                            <p className="text-xs text-amber-400 font-bold mt-1 flex items-center gap-1">
                              <Star size={12} fill="currentColor" /> {rating}
                            </p>
                          ) : null}

                          <p className="text-[11px] text-slate-400 font-mono truncate mt-1">
                            {movie.relativePath}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <Link
                        href={getMovieUrl({
                          id: movie.frontmatter.tmdb_id,
                          tmdbId: movie.frontmatter.tmdb_id,
                          title: movie.displayTitle || movie.frontmatter.title,
                          year: movie.year,
                          customSlug: movie.slug,
                        })}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        <ExternalLink size={13} />
                        <span>Buka Halaman</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (!requireToken('mengedit movie')) return;
                            openEditModal({
                              type: 'movie',
                              relativePath: movie.relativePath,
                              frontmatter: { ...movie.frontmatter },
                              content: movie.content,
                            });
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
        )}

        {/* Content List: TV Shows Tab */}
        {activeTab === 'tv' && (
          loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-pink-400" />
              <p className="text-sm">Memuat daftar TV Series...</p>
            </div>
          ) : paginatedTvShows.length === 0 ? (
            <div className="py-20 text-center bg-[#0c1224] rounded-2xl border border-white/5">
              <Tv size={40} className="mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-white mb-1">Belum Ada TV Series Ditemukan</h3>
              <p className="text-xs text-slate-400 mb-4">
                {searchQuery ? 'Tidak ada hasil untuk pencarian Anda.' : 'Mulai tambahkan TV Series baru ke sistem.'}
              </p>
              <button
                onClick={() => {
                  resetCreateForm();
                  setContentType('tv_show');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-pink-500 hover:bg-pink-400 text-white transition-all"
              >
                <Plus size={16} />
                <span>Tambah TV Series Baru</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 w-full">
              {paginatedTvShows.map((show) => {
                const title = show.displayTitle || show.frontmatter.title || show.showSlug;
                const tmdbId = show.frontmatter.tmdb_id;
                const poster = show.posterUrl || show.frontmatter.image_url;
                const year = show.year;

                return (
                  <div
                    key={show.showSlug}
                    className="p-5 sm:p-6 rounded-2xl bg-[#0c1224] border border-white/10 hover:border-pink-500/40 transition-all shadow-lg shadow-black/30 w-full"
                  >
                    {/* Show Main Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 w-full">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10 shadow-md">
                          {poster ? (
                            <Image src={poster} alt={title} fill className="object-cover" sizes="56px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Tv size={24} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                              TMDB {tmdbId}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              {show.episodes.length} Episodes
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-lg leading-snug">
                            {title} {year ? <span className="text-slate-400 font-normal text-sm">({year})</span> : ''}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">tv/{show.showSlug}/_index.md</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={getTVUrl({
                            id: show.frontmatter.tmdb_id,
                            tmdbId: show.frontmatter.tmdb_id,
                            name: show.displayTitle || show.frontmatter.title,
                            year: show.year,
                            customSlug: show.showSlug,
                          })}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-400 transition-all"
                        >
                          <ExternalLink size={13} />
                          <span>Halaman Show</span>
                        </Link>

                        <button
                          onClick={() => {
                            if (!requireToken('mengedit TV series')) return;
                            openEditModal({
                              type: 'tv_show',
                              relativePath: show.relativePath,
                              frontmatter: { ...show.frontmatter },
                              content: show.content,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-all"
                        >
                          <Edit2 size={13} />
                          <span>Kelola Series & Episode</span>
                        </button>

                        <button
                          onClick={() => handleDelete(`tv/${show.showSlug}`, title)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Hapus Seluruh TV Series"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Episodes Grid */}
                    <div className="mt-4 w-full">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Daftar Episode:
                      </h4>

                      {show.episodes.length === 0 ? (
                        <div className="p-6 text-center bg-black/20 rounded-xl border border-white/5">
                          <p className="text-xs text-slate-400 mb-2">Belum ada episode di series ini.</p>
                          <button
                            onClick={() => {
                              if (!requireToken('menambah episode')) return;
                              openEditModal({
                                type: 'tv_show',
                                relativePath: show.relativePath,
                                frontmatter: { ...show.frontmatter },
                                content: show.content,
                              });
                              setEditShowTab('episodes');
                            }}
                            className="text-xs font-bold text-pink-400 hover:text-pink-300 inline-flex items-center gap-1"
                          >
                            <Plus size={12} /> Tambah Episode Pertama
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                          {show.episodes.map((ep) => {
                            const seasonLabel = formatSeasonLabel(ep.seasonFolder);
                            const epTitle = ep.displayTitle || ep.frontmatter.title || ep.slug;
                            const epVideo = ep.frontmatter.videourl || ep.frontmatter.video_url;
                            const baseTVUrl = getTVUrl({
                              id: show.frontmatter.tmdb_id,
                              tmdbId: show.frontmatter.tmdb_id,
                              name: show.displayTitle || show.frontmatter.title,
                              year: show.year,
                              customSlug: show.showSlug,
                            });
                            const linkPath = ep.seasonFolder
                              ? `${baseTVUrl}/${ep.seasonFolder}/${ep.slug}`
                              : `${baseTVUrl}/${ep.slug}`;

                            return (
                              <div
                                key={ep.relativePath}
                                className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between w-full"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                                      {seasonLabel} : {ep.slug.toUpperCase()}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          if (!requireToken('mengedit episode')) return;
                                          openEditModal({
                                            type: 'tv_episode',
                                            relativePath: ep.relativePath,
                                            frontmatter: { ...ep.frontmatter },
                                            content: ep.content,
                                          });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-white"
                                        title="Edit Episode"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(ep.relativePath, epTitle)}
                                        className="p-1 rounded text-red-400 hover:text-red-300"
                                        title="Hapus Episode"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <h5 className="font-semibold text-white text-xs truncate mb-1" title={epTitle}>
                                    {epTitle}
                                  </h5>
                                  <p className="text-[11px] text-slate-400 font-mono truncate" title={epVideo}>
                                    {epVideo || <span className="text-red-400 font-bold">⚠️ Video belum ada</span>}
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

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-white/10 w-full">
            <div className="text-xs text-slate-400">
              Menampilkan{' '}
              <span className="font-bold text-white">
                {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}
              </span>{' '}
              -{' '}
              <span className="font-bold text-white">
                {Math.min(totalItems, currentPage * itemsPerPage)}
              </span>{' '}
              dari <span className="font-bold text-white">{totalItems}</span> konten
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ────────────────────────────────────────── */}
      {/* Modal: GitHub Token Settings */}
      {/* ────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0c1224] border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-cyan-400" />
                <h3 className="text-base font-bold text-white">Pengaturan GitHub Token</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {githubToken && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                    <ShieldCheck size={16} />
                    <span>Token tersimpan di browser</span>
                  </div>
                  <button onClick={removeToken} className="text-xs text-red-400 hover:text-red-300 font-bold underline">
                    Hapus Token
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed">
                <p className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  Cara Mendapatkan Token GitHub:
                </p>
                1. Buka GitHub &gt; <em>Settings &gt; Developer settings &gt; Personal access tokens &gt; Tokens (classic)</em>.<br />
                2. Klik <strong>Generate new token (classic)</strong>, centang izin <code className="text-cyan-300 font-bold">repo</code>.<br />
                3. Salin token tersebut dan tempelkan di kotak input di bawah ini.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  GitHub Personal Access Token (PAT) <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  placeholder="github_pat_... atau ghp_..."
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={saveToken}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25"
                >
                  Simpan Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────── */}
      {/* Modal: Buat Konten Baru (Movie / TV Series Multi-Season) */}
      {/* ────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#0c1224] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  Tambah {contentType === 'movie' ? 'Movie' : 'TV Series (Multi-Season)'} Baru
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Content Type Selector: Unified 2 Options (Movie & TV Series) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tipe Konten
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setContentType('movie');
                      setTmdbPreview(null);
                      setFormErrors({});
                    }}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 ${
                      contentType === 'movie'
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Film size={18} />
                    <span>🎬 Movie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContentType('tv_show');
                      setTmdbPreview(null);
                      setFormErrors({});
                    }}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 ${
                      contentType === 'tv_show'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 ring-2 ring-pink-400'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Tv size={18} />
                    <span>📺 TV Series (Multi-Season & Multi-Episode)</span>
                  </button>
                </div>
              </div>

              {/* TMDB ID & Live Autofetch */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    TMDB ID atau URL <span className="text-red-400 font-extrabold">* (Wajib)</span>
                  </label>
                  {formErrors.tmdb_id && (
                    <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.tmdb_id}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input
                    type="text"
                    value={formTmdbId}
                    onChange={(e) => handleTmdbIdInputChange(e.target.value)}
                    placeholder="Contoh: 1084244 atau paste URL TMDB"
                    className={`w-full flex-1 min-w-0 px-3.5 py-2.5 bg-black/40 rounded-xl text-sm text-white transition-all focus:outline-none ${
                      formErrors.tmdb_id
                        ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
                        : 'border border-white/10 focus:border-cyan-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchTmdbPreview(formTmdbId, contentType === 'movie' ? 'movie' : 'tv')}
                    disabled={fetchingTmdb || !formTmdbId}
                    className="w-full sm:w-auto px-4 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                  >
                    <Sparkles size={14} className={fetchingTmdb ? 'animate-spin' : ''} />
                    <span>{fetchingTmdb ? 'Mengambil Data...' : 'Auto-Fetch TMDB'}</span>
                  </button>
                </div>
              </div>

              {/* TMDB Live Preview Card */}
              {tmdbPreview && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3.5 animate-slide-up">
                  {tmdbPreview.posterUrl ? (
                    <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-md">
                      <Image src={tmdbPreview.posterUrl} alt="Preview" fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="w-14 h-20 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                        TMDB {tmdbPreview.id}
                      </span>
                      {tmdbPreview.rating ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" /> {tmdbPreview.rating}
                        </span>
                      ) : null}
                      {tmdbPreview.numberOfSeasons ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                          {tmdbPreview.numberOfSeasons} Seasons
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs font-extrabold text-white truncate">
                      {tmdbPreview.title} {tmdbPreview.year ? `(${tmdbPreview.year})` : ''}
                    </p>
                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{tmdbPreview.overview}</p>
                  </div>
                </div>
              )}

              {/* Duplicate Post Detected Notice */}
              {existingDuplicate && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 animate-fade-in">
                  <AlertCircle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-300">
                      Konten ini sudah ada: {existingDuplicate.displayTitle || existingDuplicate.relativePath}
                    </p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Menyimpan form ini akan otomatis <strong>mengedit dan memperbarui data</strong> pada file target (
                      <code className="text-cyan-300 font-mono">{existingDuplicate.relativePath}</code>).
                    </p>
                  </div>
                </div>
              )}

              {/* Movie Specific Video URL */}
              {contentType === 'movie' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      URL Video Movie <span className="text-red-400 font-extrabold">* (Wajib)</span>
                    </label>
                    {formErrors.videourl && (
                      <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                        <AlertCircle size={12} /> {formErrors.videourl}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formVideoUrl}
                    onChange={(e) => {
                      setFormVideoUrl(e.target.value);
                      if (e.target.value) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.videourl;
                          return next;
                        });
                      }
                    }}
                    placeholder="https://.../video.mp4 atau link .mkv / .m3u8"
                    className={`w-full px-3.5 py-2.5 bg-black/40 rounded-xl text-sm text-white font-mono transition-all focus:outline-none ${
                      formErrors.videourl
                        ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
                        : 'border border-white/10 focus:border-cyan-400'
                    }`}
                  />
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

              {/* Poster / Backdrop Image URL (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    Poster / Backdrop Image URL (Opsional)
                  </label>
                  {formTmdbId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!tmdbPreview) {
                          handleFetchTmdbPreview(formTmdbId, contentType === 'movie' ? 'movie' : 'tv');
                        }
                        setShowBackdropPicker(!showBackdropPicker);
                      }}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all"
                    >
                      <ImageIcon size={12} />
                      <span>
                        {tmdbPreview?.backdrops && tmdbPreview.backdrops.length > 0
                          ? `${showBackdropPicker ? 'Tutup Galeri' : 'Pilih Backdrop TMDB'} (${tmdbPreview.backdrops.length})`
                          : fetchingTmdb
                          ? 'Mengambil Galeri...'
                          : 'Cari Backdrop TMDB'}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formPoster}
                  onChange={(e) => setFormPoster(e.target.value)}
                  placeholder="https://image.tmdb.org/... atau pilih dari galeri backdrop di bawah"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />

                {/* Live TMDB Backdrop Image Gallery Picker */}
                {tmdbPreview?.backdrops && tmdbPreview.backdrops.length > 0 && showBackdropPicker && (
                  <div className="mt-3 p-3 bg-black/50 border border-cyan-500/30 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <ImageIcon size={14} /> Pilih Gambar Backdrop ({tmdbPreview.backdrops.length} tersedia)
                      </span>
                      <span className="text-[10px] text-slate-400">Klik untuk memilih (single choice)</span>
                    </div>

                    {/* Language Filter Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 mr-1 flex items-center gap-0.5">
                        <Filter size={10} /> Filter Bahasa:
                      </span>
                      {(() => {
                        const availableLangs = Array.from(new Set(tmdbPreview.backdrops!.map((b) => b.language)));
                        return [
                          { code: 'all', label: `Semua (${tmdbPreview.backdrops!.length})` },
                          ...availableLangs.map((lang) => {
                            const count = tmdbPreview.backdrops!.filter((b) => b.language === lang).length;
                            const langLabel =
                              lang === 'xx' || lang === 'null'
                                ? `No Language / Tanpa Teks (${count})`
                                : lang.toUpperCase() === 'ID'
                                ? `Indonesia (ID) (${count})`
                                : lang.toUpperCase() === 'EN'
                                ? `English (EN) (${count})`
                                : `${lang.toUpperCase()} (${count})`;
                            return { code: lang, label: langLabel };
                          }),
                        ].map((tab) => (
                          <button
                            key={tab.code}
                            type="button"
                            onClick={() => setSelectedBackdropLang(tab.code)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              selectedBackdropLang === tab.code
                                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ));
                      })()}
                    </div>

                    {/* Backdrops Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {tmdbPreview.backdrops!
                        .filter((b) => selectedBackdropLang === 'all' || b.language === selectedBackdropLang)
                        .map((b, idx) => {
                          const isSelected = formPoster === b.url || formPoster === b.originalUrl;
                          return (
                            <div
                              key={`${b.filePath}-${idx}`}
                              onClick={() => {
                                if (activeEpisodePickerDraftId) {
                                  // Update episode draft image
                                  setFormSeasons((prev) =>
                                    prev.map((s) => ({
                                      ...s,
                                      episodes: s.episodes.map((ep) =>
                                        ep.id === activeEpisodePickerDraftId ? { ...ep, image_url: b.url } : ep
                                      ),
                                    }))
                                  );
                                  setActiveEpisodePickerDraftId(null);
                                } else {
                                  setFormPoster(b.url);
                                }
                                setShowBackdropPicker(false);
                              }}
                              className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all aspect-video ${
                                isSelected
                                  ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-lg shadow-cyan-500/30'
                                  : 'border-white/10 hover:border-cyan-500/50 bg-black/40'
                              }`}
                            >
                              <Image
                                src={b.thumbUrl}
                                alt="Backdrop"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                              />

                              <div className="absolute top-1 left-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-black/75 text-cyan-300 backdrop-blur-sm border border-white/10">
                                  {b.language === 'xx' || b.language === 'null' ? 'No Text' : b.language.toUpperCase()}
                                </span>
                              </div>

                              <div className="absolute top-1 right-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/75 text-slate-300 backdrop-blur-sm border border-white/10">
                                  {b.width}×{b.height}
                                </span>
                              </div>

                              {isSelected && (
                                <div className="absolute inset-0 bg-cyan-950/60 backdrop-blur-[1px] flex items-center justify-center">
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] shadow-md">
                                    <CheckCircle size={12} />
                                    <span>Terpilih</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════════════ */}
              {/* TV SERIES: MULTI-SEASON & MULTI-EPISODE BUILDER */}
              {/* ════════════════════════════════════════════════════ */}
              {contentType === 'tv_show' && (
                <div className="space-y-4 p-4 sm:p-5 bg-[#090e1f] border border-purple-500/30 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                    <div>
                      <h4 className="text-sm font-extrabold text-purple-300 flex items-center gap-2">
                        <Tv size={16} /> Kelola Multi-Season & Multi-Episode
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Tambahkan season dan episode sekaligus. Otomatis dibuat saat post disimpan.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addSeason}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 transition-all"
                      >
                        <FolderPlus size={13} />
                        <span>+ Tambah Season</span>
                      </button>
                    </div>
                  </div>

                  {formErrors.episodes && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{formErrors.episodes}</span>
                    </div>
                  )}

                  {/* Season Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {formSeasons.map((s) => {
                      const isActive = activeSeasonTab === s.season;
                      return (
                        <div key={s.id} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setActiveSeasonTab(s.season)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                              isActive
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
                            }`}
                          >
                            <span>{s.name}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-purple-200">
                              {s.episodes.length} ep
                            </span>
                          </button>

                          {formSeasons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSeason(s.season)}
                              className="ml-1 p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title={`Hapus ${s.name}`}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Season Episodes Content */}
                  {(() => {
                    const currentSeason = formSeasons.find((s) => s.season === activeSeasonTab) || formSeasons[0];
                    if (!currentSeason) return null;

                    return (
                      <div className="space-y-3 pt-2">
                        {/* Season Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/40 rounded-xl border border-white/5">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <ListPlus size={14} className="text-purple-400" />
                            Daftar Episode di {currentSeason.name} ({currentSeason.episodes.length})
                          </span>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => addEpisodeToSeason(currentSeason.season)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 transition-all"
                            >
                              <Plus size={12} />
                              <span>+ Tambah 1 Ep</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickGenerateEpisodes(currentSeason.season, 8)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-all"
                              title="Buat 8 baris episode sekaligus"
                            >
                              <Sparkles size={12} />
                              <span>⚡ +8 Episode</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowBatchUrlInput(!showBatchUrlInput)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all"
                            >
                              <Copy size={12} />
                              <span>📋 Paste Banyak URL</span>
                            </button>
                          </div>
                        </div>

                        {/* Batch Paste URLs Box */}
                        {showBatchUrlInput && (
                          <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2 animate-fade-in">
                            <label className="block text-xs font-bold text-cyan-300">
                              Tempelkan URL Video (1 URL per baris):
                            </label>
                            <textarea
                              rows={4}
                              value={batchUrlsInput}
                              onChange={(e) => setBatchUrlsInput(e.target.value)}
                              placeholder={`https://example.com/s1e1.mp4\nhttps://example.com/s1e2.mp4\nhttps://example.com/s1e3.mp4`}
                              className="w-full p-2.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setShowBatchUrlInput(false)}
                                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBatchPasteUrls(currentSeason.season)}
                                className="px-3.5 py-1.5 bg-cyan-500 text-black font-bold rounded-lg text-xs hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                              >
                                Masukkan ke {currentSeason.name}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Episodes List in Active Season */}
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {currentSeason.episodes.map((ep, epIdx) => (
                            <div
                              key={ep.id}
                              className="p-3 bg-black/30 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all hover:border-purple-500/40"
                            >
                              {/* Episode Badge */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-12 text-center py-1 rounded-lg text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  EP {ep.episode}
                                </span>
                              </div>

                              {/* Video URL Input */}
                              <div className="flex-1 min-w-0 w-full">
                                <input
                                  type="text"
                                  value={ep.videourl}
                                  onChange={(e) =>
                                    updateEpisodeInSeason(currentSeason.season, ep.id, 'videourl', e.target.value)
                                  }
                                  placeholder="URL Video (Wajib: https://.../video.mp4)"
                                  className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                                />
                              </div>

                              {/* Episode Title Input */}
                              <div className="w-full sm:w-44 flex-shrink-0">
                                <input
                                  type="text"
                                  value={ep.title || ''}
                                  onChange={(e) =>
                                    updateEpisodeInSeason(currentSeason.season, ep.id, 'title', e.target.value)
                                  }
                                  placeholder="Judul (Opsional)"
                                  className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-400"
                                />
                              </div>

                              {/* Mini Backdrop Picker & Delete Action */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                {tmdbPreview?.backdrops && tmdbPreview.backdrops.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveEpisodePickerDraftId(ep.id);
                                      setShowBackdropPicker(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                                    title="Pilih Gambar dari TMDB Backdrop"
                                  >
                                    <ImageIcon size={14} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeEpisodeFromSeason(currentSeason.season, ep.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                  title="Hapus Baris Episode"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Rating and Featured in Homepage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rating (Opsional - misal 8.5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    placeholder="Contoh: 8.5"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div
                  onClick={() => setFormFeatured(!formFeatured)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Star size={16} fill={formFeatured ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white select-none">Featured di Homepage</p>
                      <p className="text-[11px] text-slate-400 select-none">Tampilkan di slider / hero banner utama</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:items-center sm:justify-end sm:w-auto pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 text-center transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 text-center transition-all"
                >
                  {existingDuplicate ? 'Update Konten' : contentType === 'tv_show' ? 'Simpan TV Series' : 'Simpan Post Konten'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────── */}
      {/* Modal: Edit Konten (Unified Movie / TV Series / Episode) */}
      {/* ────────────────────────────────────────── */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#0c1224] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Edit2 size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  Edit {editingItem.type === 'movie' ? 'Movie' : editingItem.type === 'tv_show' ? 'TV Series' : 'Episode'} ({editingItem.relativePath})
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs if editing a TV Show */}
            {editingItem.type === 'tv_show' && (
              <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setEditShowTab('info')}
                  className={`py-2 px-4 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editShowTab === 'info'
                      ? 'bg-white/10 text-white border-b-2 border-cyan-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  <span>Informasi TV Series</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditShowTab('episodes')}
                  className={`py-2 px-4 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editShowTab === 'episodes'
                      ? 'bg-purple-950/40 text-purple-300 border-b-2 border-purple-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv size={14} />
                  <span>Kelola Season & Episode ({currentEditingShow?.episodes.length || 0})</span>
                </button>
              </div>
            )}

            {/* TV Show Episodes Manager Tab */}
            {editingItem.type === 'tv_show' && editShowTab === 'episodes' && currentEditingShow && (
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Daftar Episode {currentEditingShow.displayTitle}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Kelola semua episode yang ada di TV Series ini secara langsung.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAddEpisodeToEditShow(currentEditingShow, editActiveSeasonTab)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white flex items-center gap-1 shadow-md shadow-purple-500/20"
                    >
                      <Plus size={13} />
                      <span>+ Tambah Episode ke {formatSeasonLabel(editActiveSeasonTab)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEditBatchUrlInput(!showEditBatchUrlInput)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 hover:bg-cyan-500/30"
                    >
                      <Copy size={13} />
                      <span>📋 Batch URL</span>
                    </button>
                  </div>
                </div>

                {/* Batch URL Box for Existing Show */}
                {showEditBatchUrlInput && (
                  <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2 animate-fade-in">
                    <label className="block text-xs font-bold text-cyan-300">
                      Tempelkan URL Video Episode Baru ke {formatSeasonLabel(editActiveSeasonTab)} (1 URL per baris):
                    </label>
                    <textarea
                      rows={4}
                      value={editBatchUrlsInput}
                      onChange={(e) => setEditBatchUrlsInput(e.target.value)}
                      placeholder={`https://example.com/ep1.mp4\nhttps://example.com/ep2.mp4`}
                      className="w-full p-2.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditBatchUrlInput(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditShowBatchPasteUrls(currentEditingShow, editActiveSeasonTab)}
                        className="px-3.5 py-1.5 bg-cyan-500 text-black font-bold rounded-lg text-xs hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                      >
                        Simpan Episode Baru
                      </button>
                    </div>
                  </div>
                )}

                {/* Season Navigation Tabs in Edit Modal */}
                {(() => {
                  const seasons = getShowSeasons(currentEditingShow);
                  return (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {seasons.map((s) => {
                        const count = currentEditingShow.episodes.filter(
                          (ep) => (ep.seasonFolder || 's1').toLowerCase() === s.toLowerCase()
                        ).length;
                        const isActive = editActiveSeasonTab === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditActiveSeasonTab(s)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                              isActive
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
                            }`}
                          >
                            <span>{formatSeasonLabel(s)}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-purple-200">
                              {count} ep
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Episodes in this Season */}
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {currentEditingShow.episodes
                    .filter((ep) => (ep.seasonFolder || 's1').toLowerCase() === editActiveSeasonTab.toLowerCase())
                    .map((ep) => (
                      <div
                        key={ep.relativePath}
                        className="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300">
                              {ep.slug.toUpperCase()}
                            </span>
                            <h5 className="font-bold text-xs text-white truncate">
                              {ep.displayTitle || ep.frontmatter.title || ep.slug}
                            </h5>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {ep.frontmatter.videourl || ep.frontmatter.video_url || 'Belum ada link video'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal({
                                type: 'tv_episode',
                                relativePath: ep.relativePath,
                                frontmatter: { ...ep.frontmatter },
                                content: ep.content,
                              })
                            }
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                            title="Edit Episode Details"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(ep.relativePath, ep.displayTitle)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Hapus Episode"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Standard Edit Form (Movie, TV Series Info, TV Episode) */}
            {!(editingItem.type === 'tv_show' && editShowTab === 'episodes') && (
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* TMDB ID (if movie or show) */}
                {editingItem.type !== 'tv_episode' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        TMDB ID atau URL <span className="text-red-400 font-extrabold">* (Wajib)</span>
                      </label>
                      {editErrors.tmdb_id && (
                        <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {editErrors.tmdb_id}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingItem.frontmatter.tmdb_id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const ext = extractTmdbIdAndType(val);
                        const cleanId = (val.includes('themoviedb.org') || val.includes('/movie/') || val.includes('/tv/')) && ext.id ? ext.id : val;
                        setEditingItem({
                          ...editingItem,
                          frontmatter: { ...editingItem.frontmatter, tmdb_id: cleanId },
                        });
                        if (val) {
                          setEditErrors((prev) => {
                            const next = { ...prev };
                            delete next.tmdb_id;
                            return next;
                          });
                        }
                      }}
                      placeholder="Contoh: 1084244 atau paste URL TMDB"
                      className={`w-full px-3.5 py-2.5 bg-black/40 rounded-xl text-sm text-white transition-all focus:outline-none ${
                        editErrors.tmdb_id
                          ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
                          : 'border border-white/10 focus:border-cyan-400'
                      }`}
                    />
                  </div>
                )}

                {/* Video URL (if movie or episode) */}
                {editingItem.type !== 'tv_show' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        URL Video (videourl) <span className="text-red-400 font-extrabold">* (Wajib)</span>
                      </label>
                      {editErrors.videourl && (
                        <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {editErrors.videourl}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingItem.frontmatter.videourl || editingItem.frontmatter.video_url || ''}
                      onChange={(e) => {
                        setEditingItem({
                          ...editingItem,
                          frontmatter: { ...editingItem.frontmatter, videourl: e.target.value },
                        });
                        if (e.target.value) {
                          setEditErrors((prev) => {
                            const next = { ...prev };
                            delete next.videourl;
                            return next;
                          });
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-black/40 rounded-xl text-sm text-white font-mono transition-all focus:outline-none ${
                        editErrors.videourl
                          ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
                          : 'border border-white/10 focus:border-cyan-400'
                      }`}
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

                {/* Image URL with Backdrop Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-400">Poster / Image URL</label>
                    {(() => {
                      let tmdbIdNum = editingItem.frontmatter.tmdb_id;
                      if (!tmdbIdNum && editingItem.type === 'tv_episode') {
                        const showSlug = editingItem.relativePath.split('/')[1];
                        const show = tvShows.find((s) => s.showSlug === showSlug);
                        tmdbIdNum = show?.frontmatter.tmdb_id;
                      }
                      if (!tmdbIdNum) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (!editTmdbPreview) {
                              handleFetchEditTmdbPreview(
                                String(tmdbIdNum),
                                editingItem.type === 'movie' ? 'movie' : 'tv'
                              );
                            }
                            setShowEditBackdropPicker(!showEditBackdropPicker);
                          }}
                          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all"
                        >
                          <ImageIcon size={12} />
                          <span>
                            {editTmdbPreview?.backdrops && editTmdbPreview.backdrops.length > 0
                              ? `${showEditBackdropPicker ? 'Tutup Galeri' : 'Pilih Backdrop TMDB'} (${editTmdbPreview.backdrops.length})`
                              : fetchingEditTmdb
                              ? 'Mengambil Galeri...'
                              : 'Cari Backdrop TMDB'}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                  <input
                    type="text"
                    value={editingItem.frontmatter.image_url || editingItem.frontmatter.poster_path || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        frontmatter: { ...editingItem.frontmatter, image_url: e.target.value },
                      })
                    }
                    placeholder="https://image.tmdb.org/... atau pilih dari galeri backdrop di bawah"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />

                  {/* Live TMDB Backdrop Image Gallery Picker in Edit Modal */}
                  {editTmdbPreview?.backdrops && editTmdbPreview.backdrops.length > 0 && showEditBackdropPicker && (
                    <div className="mt-3 p-3 bg-black/50 border border-cyan-500/30 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <ImageIcon size={14} /> Pilih Gambar Backdrop ({editTmdbPreview.backdrops.length} tersedia)
                        </span>
                        <span className="text-[10px] text-slate-400">Klik untuk memilih (single choice)</span>
                      </div>

                      {/* Language Filter Tabs */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1 flex items-center gap-0.5">
                          <Filter size={10} /> Filter Bahasa:
                        </span>
                        {(() => {
                          const availableLangs = Array.from(new Set(editTmdbPreview.backdrops!.map((b) => b.language)));
                          return [
                            { code: 'all', label: `Semua (${editTmdbPreview.backdrops!.length})` },
                            ...availableLangs.map((lang) => {
                              const count = editTmdbPreview.backdrops!.filter((b) => b.language === lang).length;
                              const langLabel =
                                lang === 'xx' || lang === 'null'
                                  ? `No Language / Tanpa Teks (${count})`
                                  : lang.toUpperCase() === 'ID'
                                  ? `Indonesia (ID) (${count})`
                                  : lang.toUpperCase() === 'EN'
                                  ? `English (EN) (${count})`
                                  : `${lang.toUpperCase()} (${count})`;
                              return { code: lang, label: langLabel };
                            }),
                          ].map((tab) => (
                            <button
                              key={tab.code}
                              type="button"
                              onClick={() => setEditSelectedBackdropLang(tab.code)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                editSelectedBackdropLang === tab.code
                                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25'
                                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ));
                        })()}
                      </div>

                      {/* Backdrops Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {editTmdbPreview.backdrops!
                          .filter((b) => editSelectedBackdropLang === 'all' || b.language === editSelectedBackdropLang)
                          .map((b, idx) => {
                            const isSelected =
                              editingItem.frontmatter.image_url === b.url ||
                              editingItem.frontmatter.image_url === b.originalUrl;
                            return (
                              <div
                                key={`${b.filePath}-${idx}`}
                                onClick={() => {
                                  setEditingItem({
                                    ...editingItem,
                                    frontmatter: { ...editingItem.frontmatter, image_url: b.url },
                                  });
                                  setShowEditBackdropPicker(false);
                                }}
                                className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all aspect-video ${
                                  isSelected
                                    ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-lg shadow-cyan-500/30'
                                    : 'border-white/10 hover:border-cyan-500/50 bg-black/40'
                                }`}
                              >
                                <Image
                                  src={b.thumbUrl}
                                  alt="Backdrop"
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                />

                                <div className="absolute top-1 left-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-black/75 text-cyan-300 backdrop-blur-sm border border-white/10">
                                    {b.language === 'xx' || b.language === 'null' ? 'No Text' : b.language.toUpperCase()}
                                  </span>
                                </div>

                                <div className="absolute top-1 right-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/75 text-slate-300 backdrop-blur-sm border border-white/10">
                                    {b.width}×{b.height}
                                  </span>
                                </div>

                                {isSelected && (
                                  <div className="absolute inset-0 bg-cyan-950/60 backdrop-blur-[1px] flex items-center justify-center">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] shadow-md">
                                      <CheckCircle size={12} />
                                      <span>Terpilih</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating & Featured (if movie or show) */}
                {editingItem.type !== 'tv_episode' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
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

                    <div
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          frontmatter: { ...editingItem.frontmatter, featured: !editingItem.frontmatter.featured },
                        })
                      }
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                          <Star size={16} fill={editingItem.frontmatter.featured ? 'currentColor' : 'none'} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white select-none">Jadikan Featured</p>
                          <p className="text-[11px] text-slate-400 select-none">Tampilkan di slider / hero banner</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.frontmatter.featured)}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            frontmatter: { ...editingItem.frontmatter, featured: e.target.checked },
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Subtitles & Duration (if episode or movie) */}
                {editingItem.type !== 'tv_show' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Durasi</label>
                      <input
                        type="text"
                        value={editingItem.frontmatter.duration || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            frontmatter: { ...editingItem.frontmatter, duration: e.target.value },
                          })
                        }
                        placeholder="Contoh: 45m"
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Subtitles URL</label>
                      <input
                        type="text"
                        value={editingItem.frontmatter.subtitles || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            frontmatter: { ...editingItem.frontmatter, subtitles: e.target.value },
                          })
                        }
                        placeholder="https://.../sub.vtt"
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:items-center sm:justify-end sm:w-auto pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 text-center transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25 text-center transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
