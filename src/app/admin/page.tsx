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
} from 'lucide-react';

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
  posterUrl?: string | null;
  displayTitle?: string;
  year?: number | null;
  rating?: number | null;
  updatedAt?: number;
  isOptimistic?: boolean;
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
  displayTitle?: string;
  posterUrl?: string | null;
  updatedAt?: number;
  isOptimistic?: boolean;
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
  posterUrl?: string | null;
  displayTitle?: string;
  year?: number | null;
  rating?: number | null;
  updatedAt?: number;
  isOptimistic?: boolean;
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
      const cleanSlug = formShowSlug.trim() ? slugify(formShowSlug) : null;
      if (!idNum && !cleanSlug) return null;
      return (
        tvShows.find((s) => {
          const matchId = idNum && Number(s.frontmatter.tmdb_id) === idNum;
          const matchSlug = cleanSlug && s.showSlug === cleanSlug;
          return matchId || matchSlug;
        }) || null
      );
    }
    if (contentType === 'tv_episode') {
      const cleanShow = formShowSlug.trim() ? slugify(formShowSlug) : null;
      const rawSeason = formSeason.trim();
      const cleanSeason = rawSeason ? (rawSeason.toLowerCase().startsWith('s') ? rawSeason.toLowerCase() : `s${rawSeason.replace(/\D/g, '') || '1'}`) : 's1';
      const epNum = formEpisode.replace(/\D/g, '') || '1';
      if (!cleanShow || !epNum) return null;
      const show = tvShows.find((s) => s.showSlug === cleanShow);
      if (!show) return null;
      return (
        show.episodes.find((ep) => {
          const epSeason = (ep.seasonFolder || 's1').toLowerCase();
          const epNumParsed = parseEpisodeNumber(ep.slug) || parseEpisodeNumber(ep.filename);
          const isSameSeason = epSeason === cleanSeason || epSeason.replace(/\D/g, '') === cleanSeason.replace(/\D/g, '');
          const isSameEp = epNumParsed === parseInt(epNum, 10);
          return isSameSeason && isSameEp;
        }) || null
      );
    }
    return null;
  }, [contentType, formTmdbId, formSlug, formShowSlug, formSeason, formEpisode, movies, tvShows]);

  // Load saved token & optimistic cache from localStorage on mount (eliminates flicker)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('levistream_github_token') || '';
      setGithubToken(saved);
      setTempToken(saved);

      // Load cached optimistic preview items
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

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Guard action requiring GitHub token
  const requireToken = (actionDescription: string): boolean => {
    if (!githubToken) {
      setIsSettingsOpen(true);
      showToast(`GitHub Token wajib diisi sebelum ${actionDescription}!`, 'error');
      return false;
    }
    return true;
  };

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (githubToken) {
      headers['x-github-token'] = githubToken;
    }
    return headers;
  }, [githubToken]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setMovies(data.movies || []);
        setTvShows(data.tvShows || []);
        try {
          localStorage.setItem('cms_cached_movies', JSON.stringify(data.movies || []));
          localStorage.setItem('cms_cached_tv', JSON.stringify(data.tvShows || []));
        } catch {}
      } else {
        showToast(data.error || 'Gagal memuat konten', 'error');
      }
    } catch (e: any) {
      showToast('Network error saat memuat konten', 'error');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Fetch TMDB images/details for Edit Modal
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

  // Open Create Episode Modal with smart auto-filling of next episode number
  const openCreateEpisodeModal = (initialShowSlug?: string) => {
    resetCreateForm();
    setContentType('tv_episode');
    const targetShowSlug = initialShowSlug || formShowSlug || (tvShows[0]?.showSlug || '');
    setFormShowSlug(targetShowSlug);
    const show = tvShows.find((s) => s.showSlug === targetShowSlug);
    const seasons = getShowSeasons(show);
    const latestSeason = seasons[seasons.length - 1] || 's1';
    setFormSeason(latestSeason);
    const nextEp = getNextEpisodeNumber(show, latestSeason);
    setFormEpisode(String(nextEp));
    setIsCreateModalOpen(true);
    if (show?.frontmatter.tmdb_id) {
      handleFetchTmdbPreview(String(show.frontmatter.tmdb_id), 'tv');
    }
  };

  const handleShowSlugChange = (slug: string) => {
    setFormShowSlug(slug);
    const show = tvShows.find((s) => s.showSlug === slug);
    const seasons = getShowSeasons(show);
    const latestSeason = seasons[seasons.length - 1] || 's1';
    setFormSeason(latestSeason);
    const nextEp = getNextEpisodeNumber(show, latestSeason);
    setFormEpisode(String(nextEp));
    if (show?.frontmatter.tmdb_id) {
      handleFetchTmdbPreview(String(show.frontmatter.tmdb_id), 'tv');
    }
  };

  const handleSeasonChange = (season: string) => {
    setFormSeason(season);
    const show = tvShows.find((s) => s.showSlug === formShowSlug);
    const nextEp = getNextEpisodeNumber(show, season);
    setFormEpisode(String(nextEp));
  };

  const handleSmartAddSeason = () => {
    const show = tvShows.find((s) => s.showSlug === formShowSlug);
    const seasons = getShowSeasons(show);
    let maxSeasonNum = 0;
    seasons.forEach((s) => {
      const num = parseInt(s.replace(/\D/g, '') || '0', 10);
      if (num > maxSeasonNum) maxSeasonNum = num;
    });
    const newSeasonSlug = `s${maxSeasonNum + 1}`;
    setFormSeason(newSeasonSlug);
    setFormEpisode('1');
    showToast(`Season baru (${formatSeasonLabel(newSeasonSlug)}) dipilih. Episode otomatis diset ke 1.`, 'success');
  };

  const incrementEpisode = () => {
    const current = parseInt(formEpisode.replace(/\D/g, '') || '1', 10);
    setFormEpisode(String(current + 1));
  };

  const decrementEpisode = () => {
    const current = parseInt(formEpisode.replace(/\D/g, '') || '1', 10);
    if (current > 1) {
      setFormEpisode(String(current - 1));
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
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.tmdb_id;
          return next;
        });
      } else {
        setTmdbPreview(null);
        showToast(data.error || 'Data TMDB tidak ditemukan', 'error');
      }
    } catch (e) {
      setTmdbPreview(null);
      showToast('Gagal menghubungi TMDB API', 'error');
    } finally {
      setFetchingTmdb(false);
    }
  };

  // Handler for typing or pasting into TMDB ID input (no auto-fetch on typing/pasting)
  const handleTmdbIdInputChange = (val: string) => {
    const extracted = extractTmdbIdAndType(val);
    if (val.includes('themoviedb.org') || val.includes('/movie/') || val.includes('/tv/')) {
      if (extracted.id) {
        setFormTmdbId(extracted.id);
        if (extracted.type && extracted.type === 'tv' && contentType === 'movie') {
          setContentType('tv_show');
        } else if (extracted.type && extracted.type === 'movie' && contentType === 'tv_show') {
          setContentType('movie');
        }
        // Biarkan kosong untuk manual, fetch hanya dipicu saat tombol Auto-Fetch ditekan
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.tmdb_id;
          return next;
        });
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
    setFormShowSlug('');
    setFormSeason('s1');
    setFormEpisode('e1');
    setFormErrors({});
    setTmdbPreview(null);
    setShowBackdropPicker(false);
    setSelectedBackdropLang('all');
  };

  // Validate create form
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (contentType === 'movie' || contentType === 'tv_show') {
      const extracted = extractTmdbIdAndType(formTmdbId);
      if (!formTmdbId.trim()) {
        errors.tmdb_id = 'TMDB ID wajib diisi!';
      } else if (!extracted.id) {
        errors.tmdb_id = 'TMDB ID harus berupa angka atau URL TMDB yang valid!';
      }
    }

    if (contentType === 'movie' || contentType === 'tv_episode') {
      if (!formVideoUrl.trim()) {
        errors.videourl = 'URL Video wajib diisi!';
      }
    }

    if (contentType === 'tv_episode') {
      if (!formShowSlug.trim()) {
        errors.showSlug = 'Show slug wajib diisi!';
      }
      if (!formEpisode.trim()) {
        errors.episode = 'Nomor Episode wajib diisi!';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create with Instant Optimistic Preview
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

    const epNum = formEpisode.replace(/\D/g, '') || '1';
    const rawSeason = formSeason.trim();
    const cleanSeason = rawSeason ? (rawSeason.toLowerCase().startsWith('s') ? rawSeason.toLowerCase() : `s${rawSeason.replace(/\D/g, '') || '1'}`) : 's1';
    const cleanEp = `e${epNum}`;

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
      showSlug: formShowSlug.trim() || undefined,
      season: cleanSeason,
      episode: cleanEp,
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
    } else if (contentType === 'tv_episode') {
      setTvShows((prev) => {
        const targetShow = prev.find((s) => s.showSlug === formShowSlug.trim());
        if (!targetShow) return prev;
        const posterImg = payload.poster || tmdbPreview?.posterUrl || null;
        const formattedPoster = posterImg ? (posterImg.startsWith('http') ? posterImg : `https://image.tmdb.org/t/p/w500${posterImg}`) : null;
        const newEp: TVEpisodeItem = {
          showSlug: formShowSlug.trim(),
          seasonFolder: cleanSeason,
          filename: `${cleanEp}.md`,
          slug: cleanEp,
          relativePath: `tv/${formShowSlug.trim()}/${cleanSeason}/${cleanEp}.md`,
          frontmatter: {
            title: payload.title,
            videourl: payload.videourl,
            image_url: payload.poster,
            rating: payload.rating,
            duration: payload.duration,
            subtitles: payload.subtitles,
            deskripsi: payload.desc,
          },
          content: '',
          displayTitle: payload.title || `Episode ${epNum}`,
          posterUrl: formattedPoster,
          updatedAt: Date.now(),
        };
        const updatedEpisodes = [...targetShow.episodes.filter((ep) => ep.relativePath !== newEp.relativePath), newEp];
        const updatedShow: TVShowItem = {
          ...targetShow,
          episodes: updatedEpisodes,
          updatedAt: Date.now(),
        };
        return [updatedShow, ...prev.filter((s) => s.showSlug !== targetShow.showSlug)];
      });
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
            showToast(
              `Post ini sudah ada (data tetap sama).`,
              'warning'
            );
          }
        } else {
          showToast(`Berhasil membuat post baru: ${result.relativePath}`, 'success');
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
    setTvShows((prev) => prev.filter((s) => s.relativePath !== relativePath && !relativePath.startsWith(`tv/${s.showSlug}`)));

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
        if (data.requiresToken) {
          setIsSettingsOpen(true);
        }
        showToast(data.error || 'Gagal menghapus', 'error');
        fetchContent();
      }
    } catch (e) {
      showToast('Error saat menghapus konten', 'error');
    }
  };

  // ──────────────────────────────────────────
  // Filter & Sort Logic
  // ──────────────────────────────────────────
  const processedMovies = useMemo(() => {
    let result = movies.filter((m) => {
      const q = searchQuery.toLowerCase();
      const title = (m.displayTitle || m.frontmatter.title || m.slug).toLowerCase();
      const tmdbId = String(m.frontmatter.tmdb_id || '');
      const matchesSearch = title.includes(q) || tmdbId.includes(q) || m.filename.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterBy === 'featured') return Boolean(m.frontmatter.featured);
      if (filterBy === 'non_featured') return !m.frontmatter.featured;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortBy === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sortBy === 'title_asc') {
        const titleA = a.displayTitle || a.frontmatter.title || a.slug;
        const titleB = b.displayTitle || b.frontmatter.title || b.slug;
        return titleA.localeCompare(titleB);
      }
      if (sortBy === 'title_desc') {
        const titleA = a.displayTitle || a.frontmatter.title || a.slug;
        const titleB = b.displayTitle || b.frontmatter.title || b.slug;
        return titleB.localeCompare(titleA);
      }
      if (sortBy === 'rating_desc') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      return 0;
    });

    return result;
  }, [movies, searchQuery, sortBy, filterBy]);

  const processedTvShows = useMemo(() => {
    let result = tvShows.filter((s) => {
      const q = searchQuery.toLowerCase();
      const title = (s.displayTitle || s.frontmatter.title || s.showSlug).toLowerCase();
      const tmdbId = String(s.frontmatter.tmdb_id || '');
      const matchesSearch = title.includes(q) || tmdbId.includes(q) || s.showSlug.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterBy === 'featured') return Boolean(s.frontmatter.featured);
      if (filterBy === 'non_featured') return !s.frontmatter.featured;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortBy === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sortBy === 'title_asc') {
        const titleA = a.displayTitle || a.frontmatter.title || a.showSlug;
        const titleB = b.displayTitle || b.frontmatter.title || b.showSlug;
        return titleA.localeCompare(titleB);
      }
      if (sortBy === 'title_desc') {
        const titleA = a.displayTitle || a.frontmatter.title || a.showSlug;
        const titleB = b.displayTitle || b.frontmatter.title || b.showSlug;
        return titleB.localeCompare(titleA);
      }
      if (sortBy === 'rating_desc') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      return 0;
    });

    return result;
  }, [tvShows, searchQuery, sortBy, filterBy]);

  // Pagination slicing
  const totalItems = activeTab === 'movies' ? processedMovies.length : processedTvShows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedMovies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedMovies.slice(start, start + itemsPerPage);
  }, [processedMovies, currentPage]);

  const paginatedTvShows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedTvShows.slice(start, start + itemsPerPage);
  }, [processedTvShows, currentPage]);

  const totalEpisodes = tvShows.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#050816] text-white pt-20 pb-16 px-4 sm:px-6 md:px-8 lg:px-12 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border transition-all animate-slide-up max-w-md"
          style={{
            background:
              toastMessage.type === 'success'
                ? '#064e3b'
                : toastMessage.type === 'warning'
                ? '#78350f'
                : '#7f1d1d',
            borderColor:
              toastMessage.type === 'success'
                ? '#10b981'
                : toastMessage.type === 'warning'
                ? '#f59e0b'
                : '#ef4444',
            color: '#ffffff',
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle size={18} className="flex-shrink-0 text-emerald-300" />
          ) : toastMessage.type === 'warning' ? (
            <AlertCircle size={18} className="flex-shrink-0 text-amber-300" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0 text-red-300" />
          )}
          <span className="text-sm font-semibold leading-snug">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="w-full max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 w-full">
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
              <code className="text-pink-400">tv/</code>) dengan instant live preview & auto TMDB sync.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* GitHub Sync Indicator - Flicker-Free with tokenChecked */}
            {tokenChecked ? (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  githubToken
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
                    : 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 shadow-sm shadow-red-500/10 animate-pulse'
                }`}
                title="Pengaturan GitHub Token untuk Live Sync di Vercel"
              >
                {githubToken ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span>{githubToken ? 'GitHub Token Terhubung' : 'Token Wajib Diisi! (Klik Di Sini)'}</span>
              </button>
            ) : (
              <div className="h-10 w-44 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            )}

            <button
              onClick={() => fetchContent()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                if (!requireToken('menambah konten')) return;
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

        {/* Stats Row - 100% Full Width */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 w-full">
          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4 w-full">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Film size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Movies</p>
              <h3 className="text-2xl font-extrabold text-white">{movies.length}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4 w-full">
            <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Tv size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom TV Series</p>
              <h3 className="text-2xl font-extrabold text-white">{tvShows.length}</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 flex items-center gap-4 w-full">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Custom Episodes</p>
              <h3 className="text-2xl font-extrabold text-white">{totalEpisodes}</h3>
            </div>
          </div>
        </div>

        {/* Controls Bar - 100% Full Width */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 mt-6 p-3 sm:p-4 rounded-2xl bg-[#0c1224]/80 border border-white/10 backdrop-blur-md w-full">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('movies')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
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
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'tv'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv size={16} />
              <span>TV Series ({tvShows.length})</span>
            </button>
          </div>

          {/* Search, Sort, Filter - Responsive full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto flex-1 md:justify-end">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 md:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, file, atau TMDB..."
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Sort & Filter in 2-Column Grid on Mobile (Zero Empty Gaps) */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <div className="relative flex items-center gap-1.5 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 w-full sm:w-auto">
                <ArrowUpDown size={14} className="text-cyan-400 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer w-full text-xs"
                >
                  <option value="newest" className="bg-slate-900 text-white">⏱️ Terbaru</option>
                  <option value="oldest" className="bg-slate-900 text-white">⏳ Terlama</option>
                  <option value="title_asc" className="bg-slate-900 text-white">🔤 Judul (A-Z)</option>
                  <option value="title_desc" className="bg-slate-900 text-white">🔡 Judul (Z-A)</option>
                  <option value="rating_desc" className="bg-slate-900 text-white">⭐ Rating</option>
                </select>
              </div>

              <div className="relative flex items-center gap-1.5 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 w-full sm:w-auto">
                <Filter size={14} className="text-pink-400 flex-shrink-0" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer w-full text-xs"
                >
                  <option value="all" className="bg-slate-900 text-white">Semua Status</option>
                  <option value="featured" className="bg-slate-900 text-white">✨ Featured</option>
                  <option value="non_featured" className="bg-slate-900 text-white">Non-Featured</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - 100% Full Width Container */}
      <div className="w-full max-w-7xl mx-auto">
        {loading && movies.length === 0 ? (
          <div className="py-24 text-center">
            <RefreshCw size={36} className="animate-spin mx-auto text-cyan-400 mb-3" />
            <p className="text-slate-400 text-sm">Memuat konten markdown & poster TMDB...</p>
          </div>
        ) : activeTab === 'movies' ? (
          /* Movies List - Responsive 3 Columns */
          paginatedMovies.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c1224] border border-white/10 w-full">
              <Film size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">
                {searchQuery || filterBy !== 'all' ? 'Tidak ada movie yang cocok dengan filter' : 'Belum ada custom movie'}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {searchQuery || filterBy !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau filter status.'
                  : 'Buat file markdown movie pertama Anda dengan menekan tombol di bawah.'}
              </p>
              <button
                onClick={() => {
                  if (!requireToken('menambah movie')) return;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
              {paginatedMovies.map((movie) => {
                const title = movie.displayTitle || movie.frontmatter.title || movie.slug;
                const tmdbId = movie.frontmatter.tmdb_id;
                const videoUrl = movie.frontmatter.videourl || movie.frontmatter.video_url || '';
                const poster = movie.posterUrl || movie.frontmatter.image_url || movie.frontmatter.poster_path;
                const rating = movie.rating || movie.frontmatter.rating;
                const featured = movie.frontmatter.featured;
                const year = movie.year;

                return (
                  <div
                    key={movie.relativePath}
                    className="p-5 rounded-2xl bg-[#0c1224] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg shadow-black/30 w-full"
                  >
                    <div>
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10 shadow-md">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-800">
                              <ImageIcon size={20} className="mb-1" />
                              <span className="text-[9px] font-bold">NO POSTER</span>
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
                            {rating ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                <Star size={10} fill="currentColor" />
                                {rating}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="font-bold text-white text-base truncate leading-snug" title={title}>
                            {title} {year ? <span className="text-slate-400 font-normal text-xs">({year})</span> : ''}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono truncate">{movie.relativePath}</p>
                        </div>
                      </div>

                      {/* Video URL Display */}
                      <div className="mb-4 p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-[11px] text-slate-400 font-medium mb-0.5">URL Video (Stream Link):</p>
                        <p className="text-xs text-slate-300 font-mono truncate" title={videoUrl}>
                          {videoUrl || <span className="text-red-400 font-bold">⚠️ Belum diisi</span>}
                        </p>
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
        ) : (
          /* TV Series & Episodes List - Full Width Responsive Layout */
          paginatedTvShows.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c1224] border border-white/10 w-full">
              <Tv size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">
                {searchQuery || filterBy !== 'all' ? 'Tidak ada TV series yang cocok dengan filter' : 'Belum ada custom TV Series'}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {searchQuery || filterBy !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau filter status.'
                  : 'Buat TV Series pertama Anda dengan menekan tombol di bawah.'}
              </p>
              <button
                onClick={() => {
                  if (!requireToken('menambah TV series')) return;
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
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-800">
                              <ImageIcon size={18} />
                              <span className="text-[8px] font-bold mt-0.5">NO POSTER</span>
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
                            if (!requireToken('menambah episode')) return;
                            openCreateEpisodeModal(show.showSlug);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-all"
                        >
                          <Plus size={13} />
                          <span>Tambah Episode</span>
                        </button>

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

                    {/* Episodes Grid - Full Width Seamless Alignment */}
                    <div className="mt-4 w-full">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Daftar Episode:
                      </h4>

                      {show.episodes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Belum ada episode di series ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                          {show.episodes.map((ep) => {
                            const epTitle = ep.displayTitle || ep.frontmatter.title || ep.slug;
                            const epVideo = ep.frontmatter.videourl || ep.frontmatter.video_url;
                            const seasonLabel = ep.seasonFolder ? ep.seasonFolder.toUpperCase() : 'Flat';
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
      </div>

      {/* ────────────────────────────────────────── */}
      {/* Modal: Pengaturan GitHub Token */}
      {/* ────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0c1224] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Pengaturan Live Sync GitHub</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!githubToken && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-300 block mb-0.5">Token Diperlukan untuk Mengubah Konten!</strong>
                    Hosting Vercel bersifat Read-Only. Untuk menambah, mengedit, atau menghapus konten, masukkan Personal Access Token GitHub Anda di bawah ini.
                  </div>
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
                      setFormErrors({});
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
                      setFormErrors({});
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
                      setFormErrors({});
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
              )}

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
                      <code className="text-cyan-300 font-mono">{existingDuplicate.relativePath}</code>) jika ada perubahan.
                    </p>
                  </div>
                </div>
              )}

              {/* URL Video (Required for Movie and Episode) */}
              {(contentType === 'movie' || contentType === 'tv_episode') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      URL Video / Stream Link <span className="text-red-400 font-extrabold">* (Wajib)</span>
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

              {/* TV Episode specifics */}
              {contentType === 'tv_episode' && (
                <div className="space-y-3.5 p-4 bg-purple-950/20 border border-purple-500/30 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                      <Tv size={14} /> Pengaturan TV Show & Episode
                    </span>
                    <span className="text-[11px] text-purple-300/80 font-mono">
                      tv/{formShowSlug || 'show'}/{formSeason || 's1'}/e{formEpisode.replace(/\D/g, '') || '1'}.md
                    </span>
                  </div>

                  {/* Show Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">
                        Pilih TV Series <span className="text-red-400 font-extrabold">*</span>
                      </label>
                      {formErrors.showSlug && <span className="text-[10px] text-red-400 font-bold">Wajib</span>}
                    </div>

                    {tvShows.length > 0 ? (
                      <select
                        value={formShowSlug}
                        onChange={(e) => handleShowSlugChange(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-black/50 rounded-xl text-sm font-semibold text-white focus:outline-none cursor-pointer ${
                          formErrors.showSlug
                            ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
                            : 'border border-white/15 focus:border-purple-400'
                        }`}
                      >
                        <option value="" disabled>-- Pilih TV Series --</option>
                        {tvShows.map((s) => (
                          <option key={s.showSlug} value={s.showSlug} className="bg-[#0c1224] text-white">
                            {s.displayTitle || s.frontmatter.title || s.showSlug} ({s.episodes.length} Episodes)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formShowSlug}
                        onChange={(e) => handleShowSlugChange(e.target.value)}
                        placeholder="Contoh: lanterns"
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                      />
                    )}
                  </div>

                  {/* Season and Episode Stepper Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Season Dropdown with Smart Add (+) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">Pilih Season</label>
                        <button
                          type="button"
                          onClick={handleSmartAddSeason}
                          className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-all"
                          title="Tambah Season Baru (Auto Episode 1)"
                        >
                          <FolderPlus size={12} />
                          <span>+ Season Baru</span>
                        </button>
                      </div>
                      <select
                        value={formSeason}
                        onChange={(e) => handleSeasonChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                      >
                        {(() => {
                          const currentShow = tvShows.find((s) => s.showSlug === formShowSlug);
                          const seasons = getShowSeasons(currentShow);
                          if (!seasons.includes(formSeason) && formSeason) {
                            seasons.push(formSeason);
                          }
                          return seasons.map((s) => (
                            <option key={s} value={s} className="bg-[#0c1224] text-white">
                              {formatSeasonLabel(s)} ({s})
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Episode Number with Stepper Arrows */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">
                          Nomor Episode <span className="text-red-400 font-extrabold">*</span>
                        </label>
                        {formErrors.episode && <span className="text-[10px] text-red-400 font-bold">Wajib</span>}
                      </div>

                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={decrementEpisode}
                          className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-l-xl transition-all flex items-center justify-center select-none active:scale-95"
                          title="Kurangi Nomor Episode"
                        >
                          <Minus size={15} />
                        </button>

                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            value={formEpisode.replace(/\D/g, '') || '1'}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              setFormEpisode(digits || '1');
                              if (digits) {
                                setFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.episode;
                                  return next;
                                });
                              }
                            }}
                            className="w-full text-center py-2.5 bg-black/60 border-y border-white/15 text-sm font-bold text-white focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={incrementEpisode}
                          className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-r-xl transition-all flex items-center justify-center select-none active:scale-95"
                          title="Tambah Nomor Episode"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    Poster / Backdrop Image URL (Opsional)
                  </label>
                  {(() => {
                    let idToFetch = formTmdbId;
                    if (!idToFetch && contentType === 'tv_episode' && formShowSlug) {
                      const show = tvShows.find((s) => s.showSlug === formShowSlug);
                      idToFetch = String(show?.frontmatter.tmdb_id || '');
                    }
                    if (!idToFetch) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (!tmdbPreview) {
                            handleFetchTmdbPreview(idToFetch, contentType === 'movie' ? 'movie' : 'tv');
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
                    );
                  })()}
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
                                setFormPoster(b.url);
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

                              {/* Badges */}
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

                              {/* Selected Checkmark */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-cyan-950/60 backdrop-blur-[1px] flex items-center justify-center">
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] shadow-md">
                                    <CheckCircle size={12} />
                                    <span>Terpilih</span>
                                  </div>
                                </div>
                              )}

                              {b.voteAverage ? (
                                <div className="absolute bottom-1 left-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-amber-300 flex items-center gap-0.5 backdrop-blur-sm">
                                    <Star size={9} fill="currentColor" /> {b.voteAverage}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Rating (Optional) */}
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

              {/* Featured in Homepage Toggle (Only for Movie & TV Show) */}
              {(contentType === 'movie' || contentType === 'tv_show') && (
                <div
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    formFeatured
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setFormFeatured(!formFeatured)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                        formFeatured ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      ✨
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white select-none">Jadikan Featured di Homepage</p>
                      <p className="text-[11px] text-slate-400 select-none">Tampilkan di slider / banner utama beranda</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                  />
                </div>
              )}

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
                  {existingDuplicate ? 'Update Konten' : 'Simpan Post Konten'}
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

              {/* Video URL */}
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

              {/* Image URL */}
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
                          const currentImg = editingItem.frontmatter.image_url || editingItem.frontmatter.poster_path;
                          const isSelected = currentImg === b.url || currentImg === b.originalUrl;
                          return (
                            <div
                              key={`edit-bg-${b.filePath}-${idx}`}
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

                              {/* Badges */}
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

                              {/* Selected Checkmark */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-cyan-950/60 backdrop-blur-[1px] flex items-center justify-center">
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] shadow-md">
                                    <CheckCircle size={12} />
                                    <span>Terpilih</span>
                                  </div>
                                </div>
                              )}

                              {b.voteAverage ? (
                                <div className="absolute bottom-1 left-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-amber-300 flex items-center gap-0.5 backdrop-blur-sm">
                                    <Star size={9} fill="currentColor" /> {b.voteAverage}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Rating */}
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

              {/* Featured in Homepage (Movie and TV Show) */}
              {editingItem.type !== 'tv_episode' && (
                <div
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    editingItem.frontmatter.featured
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() =>
                    setEditingItem({
                      ...editingItem,
                      frontmatter: { ...editingItem.frontmatter, featured: !editingItem.frontmatter.featured },
                    })
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                        editingItem.frontmatter.featured ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      ✨
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white select-none">Jadikan Featured di Homepage</p>
                      <p className="text-[11px] text-slate-400 select-none">Tampilkan di slider / banner utama beranda</p>
                    </div>
                  </div>
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
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                  />
                </div>
              )}

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
          </div>
        </div>
      )}
    </div>
  );
}
