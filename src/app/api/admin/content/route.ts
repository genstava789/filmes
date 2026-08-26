import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { revalidatePath } from 'next/cache';
import { slugify, cleanVideoUrl, extractTmdbIdAndType } from '@/lib/urls';
import { saveGitHubFile, deleteGitHubFile } from '@/lib/githubStorage';
import { getMovieDetails, getTVShowDetails, getImageUrl } from '@/lib/tmdb';
import { memoryCache } from '@/lib/cache';
import { getContentProvider } from '@/lib/content';

const VIDEO_DIR = path.join(process.cwd(), 'video');
const TV_DIR = path.join(process.cwd(), 'tv');

function ensureDirectories() {
  try {
    if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
    if (!fs.existsSync(TV_DIR)) fs.mkdirSync(TV_DIR, { recursive: true });
  } catch {
    // Read-only filesystem in cloud/vercel
  }
}

function sanitizePath(relativePath: string, baseDir: string): string | null {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(baseDir, normalized);
  if (!fullPath.startsWith(baseDir)) {
    return null;
  }
  return fullPath;
}

function getGitHubConfig(req: NextRequest) {
  const token = req.headers.get('x-github-token') || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  const owner = req.headers.get('x-github-owner') || process.env.GITHUB_OWNER || 'genstava789';
  const repo = req.headers.get('x-github-repo') || process.env.GITHUB_REPO || 'filmes';
  const branch = req.headers.get('x-github-branch') || process.env.GITHUB_BRANCH || 'main';
  return { token, owner, repo, branch };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function revalidateAll() {
  try {
    memoryCache.clear();
    getContentProvider().invalidateCache();
    revalidatePath('/', 'layout');
    revalidatePath('/', 'page');
    revalidatePath('/movie', 'page');
    revalidatePath('/movie/[id]', 'page');
    revalidatePath('/tv', 'page');
    revalidatePath('/tv/browse', 'page');
    revalidatePath('/tv/[...slug]', 'page');
    revalidatePath('/embed/movie/[id]', 'page');
    revalidatePath('/embed/tv/[...slug]', 'page');
    revalidatePath('/admin', 'page');
  } catch (err) {
    console.warn('Revalidation notice:', err);
  }
}

// ──────────────────────────────────────────
// GET: Fetch all custom movies and TV series
// ──────────────────────────────────────────
export async function GET() {
  ensureDirectories();

  try {
    // 1. Movies in video/
    let movieFiles: string[] = [];
    try {
      if (fs.existsSync(VIDEO_DIR)) {
        movieFiles = fs.readdirSync(VIDEO_DIR).filter((f) => /\.(md|markdown)$/i.test(f));
      }
    } catch (e) {
      console.warn('Read video dir notice:', e);
    }

    const rawMovies = movieFiles.map((file) => {
      const fullPath = path.join(VIDEO_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);
      const { data, content } = matter(raw);
      return {
        filename: file,
        slug: file.replace(/\.(md|markdown)$/i, ''),
        relativePath: `video/${file}`,
        frontmatter: data,
        content: content || '',
        updatedAt: stat.mtimeMs || Date.now(),
      };
    });

    // Enrich movies with TMDB poster & title if missing
    const movies = await Promise.all(
      rawMovies.map(async (m) => {
        let posterUrl = m.frontmatter.image_url || m.frontmatter.poster_path || null;
        if (posterUrl) {
          posterUrl = getImageUrl(posterUrl, 'w500');
        }
        let displayTitle = m.frontmatter.title || m.slug;
        let year: number | null = null;
        let rating = m.frontmatter.rating ? Number(m.frontmatter.rating) : null;

        if (m.frontmatter.tmdb_id) {
          try {
            const tmdb = await getMovieDetails(Number(m.frontmatter.tmdb_id)).catch(() => null);
            if (tmdb) {
              if (!posterUrl && tmdb.poster_path) {
                posterUrl = getImageUrl(tmdb.poster_path, 'w500');
              }
              if (!m.frontmatter.title && tmdb.title) {
                displayTitle = tmdb.title;
              }
              if (tmdb.release_date) {
                year = new Date(tmdb.release_date).getFullYear();
              }
              if (!rating && tmdb.vote_average) {
                rating = Math.round(tmdb.vote_average * 10) / 10;
              }
            }
          } catch {
            // ignore TMDB fetch error in list
          }
        }

        return {
          ...m,
          posterUrl,
          displayTitle,
          year,
          rating,
        };
      })
    );

    // Sort movies newest first
    movies.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // 2. TV Series in tv/
    let tvDirs: string[] = [];
    try {
      if (fs.existsSync(TV_DIR)) {
        tvDirs = fs.readdirSync(TV_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
      }
    } catch (e) {
      console.warn('Read tv dir notice:', e);
    }

    const rawTvShows = tvDirs.map((showDir) => {
      const showPath = path.join(TV_DIR, showDir);
      let indexFrontmatter: any = {};
      let indexContent = '';
      let updatedAt = Date.now();

      const indexPath = fs.existsSync(path.join(showPath, '_index.md'))
        ? path.join(showPath, '_index.md')
        : fs.existsSync(path.join(showPath, 'index.md'))
        ? path.join(showPath, 'index.md')
        : null;

      if (indexPath) {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const stat = fs.statSync(indexPath);
        const parsed = matter(raw);
        indexFrontmatter = parsed.data;
        indexContent = parsed.content || '';
        updatedAt = stat.mtimeMs || Date.now();
      }

      // Read episodes
      const episodes: any[] = [];
      const entries = fs.readdirSync(showPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === '_index.md' || entry.name === 'index.md') continue;

        if (entry.isDirectory()) {
          const seasonFolder = entry.name;
          const seasonPath = path.join(showPath, seasonFolder);
          const epFiles = fs.readdirSync(seasonPath).filter((f) => /\.(md|markdown)$/i.test(f));

          for (const epFile of epFiles) {
            const epFullPath = path.join(seasonPath, epFile);
            const raw = fs.readFileSync(epFullPath, 'utf8');
            const epStat = fs.statSync(epFullPath);
            const { data, content } = matter(raw);
            episodes.push({
              showSlug: showDir,
              seasonFolder,
              filename: epFile,
              slug: epFile.replace(/\.(md|markdown)$/i, ''),
              relativePath: `tv/${showDir}/${seasonFolder}/${epFile}`,
              frontmatter: data,
              content: content || '',
              displayTitle: data.title || epFile.replace(/\.(md|markdown)$/i, ''),
              posterUrl: data.image_url || null,
              updatedAt: epStat.mtimeMs || Date.now(),
            });
          }
        } else if (/\.(md|markdown)$/i.test(entry.name)) {
          const epFullPath = path.join(showPath, entry.name);
          const raw = fs.readFileSync(epFullPath, 'utf8');
          const epStat = fs.statSync(epFullPath);
          const { data, content } = matter(raw);
          episodes.push({
            showSlug: showDir,
            seasonFolder: null,
            filename: entry.name,
            slug: entry.name.replace(/\.(md|markdown)$/i, ''),
            relativePath: `tv/${showDir}/${entry.name}`,
            frontmatter: data,
            content: content || '',
            displayTitle: data.title || entry.name.replace(/\.(md|markdown)$/i, ''),
            posterUrl: data.image_url || null,
            updatedAt: epStat.mtimeMs || Date.now(),
          });
        }
      }

      return {
        showSlug: showDir,
        relativePath: `tv/${showDir}/_index.md`,
        frontmatter: indexFrontmatter,
        content: indexContent,
        updatedAt,
        episodes,
      };
    });

    // Enrich TV shows with TMDB poster & metadata if missing
    const tvShows = await Promise.all(
      rawTvShows.map(async (s) => {
        let posterUrl = s.frontmatter.image_url || null;
        if (posterUrl) {
          posterUrl = getImageUrl(posterUrl, 'w500');
        }
        let displayTitle = s.frontmatter.title || s.showSlug;
        let year: number | null = null;
        let rating = s.frontmatter.rating ? Number(s.frontmatter.rating) : null;

        if (s.frontmatter.tmdb_id) {
          try {
            const tmdb = await getTVShowDetails(Number(s.frontmatter.tmdb_id)).catch(() => null);
            if (tmdb) {
              if (!posterUrl && tmdb.poster_path) {
                posterUrl = getImageUrl(tmdb.poster_path, 'w500');
              }
              if (!s.frontmatter.title && tmdb.name) {
                displayTitle = tmdb.name;
              }
              if (tmdb.first_air_date) {
                year = new Date(tmdb.first_air_date).getFullYear();
              }
              if (!rating && tmdb.vote_average) {
                rating = Math.round(tmdb.vote_average * 10) / 10;
              }
            }
          } catch {
            // ignore TMDB fetch error
          }
        }

        return {
          ...s,
          posterUrl,
          displayTitle,
          year,
          rating,
        };
      })
    );

    // Sort TV shows newest first
    tvShows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const isLocal = !process.env.VERCEL && process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      movies,
      tvShows,
      isLocal,
      defaultOwner: process.env.GITHUB_OWNER || 'genstava789',
      defaultRepo: process.env.GITHUB_REPO || 'filmes',
      defaultBranch: process.env.GITHUB_BRANCH || 'main',
    });
  } catch (error: any) {
    console.error('Error fetching admin content:', error);
    return NextResponse.json({ error: error.message || 'Failed to list content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// POST: Create a new custom movie, show, or episode
// ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  ensureDirectories();
  const ghConfig = getGitHubConfig(request);
  const { token } = ghConfig;

  try {
    const body = await request.json();
    const { contentType = 'movie' } = body;

    let relativePath = '';
    let fileContent = '';
    let isUpdate = false;
    let hasChanges = true;
    const changedFields: string[] = [];

    if (contentType === 'movie') {
      let { tmdb_id, videourl, title, desc, poster, rating, featured, subtitles, content = '', slug } = body;

      const extracted = extractTmdbIdAndType(String(tmdb_id || ''));
      const parsedId = extracted.id ? Number(extracted.id) : Number(tmdb_id);

      if (!parsedId || isNaN(parsedId)) {
        return NextResponse.json({ error: 'tmdb_id is required and must be a valid numeric ID or TMDB URL' }, { status: 400 });
      }

      const cleanVideo = cleanVideoUrl(videourl);
      if (!cleanVideo) {
        return NextResponse.json({ error: 'videourl (url_video) is required' }, { status: 400 });
      }

      const tmdbIdNum = parsedId;

      // If title or metadata is missing, fetch from TMDB API to enrich the markdown file
      if (!title || !desc || !poster) {
        try {
          const tmdb = await getMovieDetails(tmdbIdNum).catch(() => null);
          if (tmdb) {
            if (!title && tmdb.title) title = tmdb.title;
            if (!desc && tmdb.overview) desc = tmdb.overview;
            if (!poster && tmdb.poster_path) poster = getImageUrl(tmdb.poster_path, 'w500');
            if (rating === undefined && tmdb.vote_average) rating = Math.round(tmdb.vote_average * 10) / 10;
          }
        } catch {
          // ignore TMDB fetch error
        }
      }

      const fileSlug = slug ? slugify(slug) : title ? slugify(title) : `movie-${tmdbIdNum}`;

      // Check if existing file already exists for this tmdb_id or filename to perform in-place update
      let existingFileName: string | null = null;
      let existingFrontmatter: Record<string, any> = {};
      try {
        if (fs.existsSync(VIDEO_DIR)) {
          const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));
          for (const f of files) {
            const raw = fs.readFileSync(path.join(VIDEO_DIR, f), 'utf8');
            const parsed = matter(raw);
            if (Number(parsed.data.tmdb_id) === tmdbIdNum || f === `${fileSlug}.md` || (slug && f === `${slugify(slug)}.md`)) {
              existingFileName = f;
              existingFrontmatter = parsed.data;
              break;
            }
          }
        }
      } catch {}

      const filename = existingFileName || `${fileSlug}.md`;
      relativePath = `video/${filename}`;

      const frontmatterData: Record<string, any> = {
        tmdb_id: tmdbIdNum,
        videourl: cleanVideo,
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      else if (existingFrontmatter.title) frontmatterData.title = existingFrontmatter.title;

      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      else if (existingFrontmatter.deskripsi) frontmatterData.deskripsi = existingFrontmatter.deskripsi;

      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      else if (existingFrontmatter.image_url) frontmatterData.image_url = existingFrontmatter.image_url;

      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      else if (existingFrontmatter.rating !== undefined) frontmatterData.rating = Number(existingFrontmatter.rating);

      if (featured !== undefined) frontmatterData.featured = Boolean(featured);
      else if (existingFrontmatter.featured !== undefined) frontmatterData.featured = Boolean(existingFrontmatter.featured);

      if (subtitles && subtitles.trim()) frontmatterData.subtitles = subtitles.trim();
      else if (existingFrontmatter.subtitles) frontmatterData.subtitles = existingFrontmatter.subtitles;

      if (existingFileName) {
        isUpdate = true;
        if (frontmatterData.image_url !== existingFrontmatter.image_url) changedFields.push('Image Poster/Backdrop');
        if (Boolean(frontmatterData.featured) !== Boolean(existingFrontmatter.featured)) changedFields.push('Status Featured');
        if (frontmatterData.rating !== existingFrontmatter.rating) changedFields.push('Rating');
        if (frontmatterData.videourl !== existingFrontmatter.videourl) changedFields.push('URL Video');
        if (frontmatterData.title && frontmatterData.title !== existingFrontmatter.title) changedFields.push('Judul');
        if (frontmatterData.deskripsi && frontmatterData.deskripsi !== existingFrontmatter.deskripsi) changedFields.push('Deskripsi');
        if (frontmatterData.subtitles !== existingFrontmatter.subtitles) changedFields.push('Subtitles');
        hasChanges = changedFields.length > 0;
      }

      fileContent = matter.stringify(content || '', frontmatterData);
    } else if (contentType === 'tv_show') {
      let { tmdb_id, title, desc, poster, rating, featured, showSlug, content = '', seasons = [] } = body;

      const extracted = extractTmdbIdAndType(String(tmdb_id || ''));
      const parsedId = extracted.id ? Number(extracted.id) : Number(tmdb_id);

      if (!parsedId || isNaN(parsedId)) {
        return NextResponse.json({ error: 'tmdb_id is required and must be a valid numeric ID or TMDB URL' }, { status: 400 });
      }

      const tmdbIdNum = parsedId;

      // If title or metadata is missing, fetch from TMDB API
      if (!title || !desc || !poster) {
        try {
          const tmdb = await getTVShowDetails(tmdbIdNum).catch(() => null);
          if (tmdb) {
            if (!title && tmdb.name) title = tmdb.name;
            if (!desc && tmdb.overview) desc = tmdb.overview;
            if (!poster && tmdb.poster_path) poster = getImageUrl(tmdb.poster_path, 'w500');
            if (rating === undefined && tmdb.vote_average) rating = Math.round(tmdb.vote_average * 10) / 10;
          }
        } catch {
          // ignore TMDB fetch error
        }
      }

      const cleanShowSlug = showSlug ? slugify(showSlug) : title ? slugify(title) : `tv-${tmdb_id}`;

      let existingShowSlug = cleanShowSlug;
      let existingFrontmatter: Record<string, any> = {};
      let foundExisting = false;
      try {
        if (fs.existsSync(TV_DIR)) {
          const shows = fs.readdirSync(TV_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
          for (const s of shows) {
            const indexPath = path.join(TV_DIR, s.name, '_index.md');
            if (fs.existsSync(indexPath)) {
              const raw = fs.readFileSync(indexPath, 'utf8');
              const parsed = matter(raw);
              if (Number(parsed.data.tmdb_id) === tmdbIdNum || s.name === cleanShowSlug) {
                existingShowSlug = s.name;
                existingFrontmatter = parsed.data;
                foundExisting = true;
                break;
              }
            }
          }
        }
      } catch {}

      relativePath = `tv/${existingShowSlug}/_index.md`;

      const frontmatterData: Record<string, any> = {
        tmdb_id: tmdbIdNum,
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      else if (existingFrontmatter.title) frontmatterData.title = existingFrontmatter.title;

      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      else if (existingFrontmatter.deskripsi) frontmatterData.deskripsi = existingFrontmatter.deskripsi;

      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      else if (existingFrontmatter.image_url) frontmatterData.image_url = existingFrontmatter.image_url;

      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      else if (existingFrontmatter.rating !== undefined) frontmatterData.rating = Number(existingFrontmatter.rating);

      if (featured !== undefined) frontmatterData.featured = Boolean(featured);
      else if (existingFrontmatter.featured !== undefined) frontmatterData.featured = Boolean(existingFrontmatter.featured);

      if (foundExisting) {
        isUpdate = true;
        if (frontmatterData.image_url !== existingFrontmatter.image_url) changedFields.push('Image Poster/Backdrop');
        if (Boolean(frontmatterData.featured) !== Boolean(existingFrontmatter.featured)) changedFields.push('Status Featured');
        if (frontmatterData.rating !== existingFrontmatter.rating) changedFields.push('Rating');
        if (frontmatterData.title && frontmatterData.title !== existingFrontmatter.title) changedFields.push('Judul');
        if (frontmatterData.deskripsi && frontmatterData.deskripsi !== existingFrontmatter.deskripsi) changedFields.push('Deskripsi');
        hasChanges = changedFields.length > 0;
      }

      fileContent = matter.stringify(content || '', frontmatterData);

      // Save _index.md
      let wroteIndexLocal = false;
      try {
        const fullPath = path.join(process.cwd(), relativePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, fileContent, 'utf8');
        wroteIndexLocal = true;
      } catch (fsErr: any) {
        if (fsErr.code !== 'EROFS' && !fsErr.message?.includes('read-only')) {
          throw fsErr;
        }
      }

      if (!wroteIndexLocal) {
        if (!token) {
          return NextResponse.json(
            {
              error:
                'Sistem hosting Vercel bersifat Read-Only. Masukkan GitHub Personal Access Token di Pengaturan Admin (tombol ⚙️) untuk menyimpan langsung ke repositori.',
              requiresToken: true,
            },
            { status: 400 }
          );
        }
        await saveGitHubFile(relativePath, fileContent, `cms: save ${relativePath}`, ghConfig);
      } else if (token) {
        try {
          await saveGitHubFile(relativePath, fileContent, `cms: save ${relativePath}`, ghConfig);
        } catch (ghErr: any) {
          console.warn('Local index save succeeded; GitHub sync notice:', ghErr?.message);
        }
      }

      // If multi-season episodes are provided, save each episode file!
      let savedEpisodesCount = 0;
      if (Array.isArray(seasons) && seasons.length > 0) {
        for (const s of seasons) {
          const rawSeason = String(s.season || s.name || 's1').trim();
          const cleanSeason = rawSeason.toLowerCase().startsWith('s') ? rawSeason.toLowerCase() : `s${rawSeason.replace(/\D/g, '') || '1'}`;
          const episodesList = Array.isArray(s.episodes) ? s.episodes : [];

          for (const ep of episodesList) {
            const rawEp = String(ep.episode || ep.slug || 'e1').trim();
            const epNum = rawEp.replace(/\D/g, '') || '1';
            const cleanEp = `e${epNum}`;
            const epCleanVideo = cleanVideoUrl(ep.videourl || ep.video_url || '');

            if (epCleanVideo) {
              const epRelPath = `tv/${existingShowSlug}/${cleanSeason}/${cleanEp}.md`;
              const epFrontmatter: Record<string, any> = {
                videourl: epCleanVideo,
              };
              if (ep.title && ep.title.trim()) epFrontmatter.title = ep.title.trim();
              if (ep.desc && ep.desc.trim()) epFrontmatter.deskripsi = ep.desc.trim();
              if (ep.poster || ep.image_url) epFrontmatter.image_url = (ep.poster || ep.image_url).trim();
              if (ep.rating !== undefined && ep.rating !== null && ep.rating !== '') epFrontmatter.rating = Number(ep.rating);
              if (ep.duration && ep.duration.trim()) epFrontmatter.duration = ep.duration.trim();
              if (ep.subtitles && ep.subtitles.trim()) epFrontmatter.subtitles = ep.subtitles.trim();

              const epContentStr = matter.stringify(ep.content || '', epFrontmatter);

              let wroteEpLocal = false;
              try {
                const fullEpPath = path.join(process.cwd(), epRelPath);
                const epDir = path.dirname(fullEpPath);
                if (!fs.existsSync(epDir)) fs.mkdirSync(epDir, { recursive: true });
                fs.writeFileSync(fullEpPath, epContentStr, 'utf8');
                wroteEpLocal = true;
              } catch (fsErr: any) {
                if (fsErr.code !== 'EROFS' && !fsErr.message?.includes('read-only')) {
                  throw fsErr;
                }
              }

              if (!wroteEpLocal) {
                if (!token) {
                  return NextResponse.json(
                    {
                      error:
                        'Sistem hosting Vercel bersifat Read-Only. Masukkan GitHub Personal Access Token di Pengaturan Admin (tombol ⚙️) untuk menyimpan langsung ke repositori.',
                      requiresToken: true,
                    },
                    { status: 400 }
                  );
                }
                await saveGitHubFile(epRelPath, epContentStr, `cms: save ${epRelPath}`, ghConfig);
              } else if (token) {
                try {
                  await saveGitHubFile(epRelPath, epContentStr, `cms: save ${epRelPath}`, ghConfig);
                } catch (ghErr: any) {
                  console.warn('Local ep save succeeded; GitHub sync notice:', ghErr?.message);
                }
              }
              savedEpisodesCount++;
            }
          }
        }
      }

      revalidateAll();
      return NextResponse.json({
        success: true,
        relativePath,
        isUpdate,
        hasChanges,
        changedFields,
        savedEpisodesCount,
      });
    } else if (contentType === 'tv_episode') {
      const { showSlug, season = 's1', episode = 'e1', videourl, title, desc, poster, rating, subtitles, duration, content = '' } = body;

      if (!showSlug) {
        return NextResponse.json({ error: 'showSlug is required for TV episode' }, { status: 400 });
      }
      const cleanVideo = cleanVideoUrl(videourl);
      if (!cleanVideo) {
        return NextResponse.json({ error: 'videourl (url_video) is required for TV episode' }, { status: 400 });
      }

      const cleanShowSlug = slugify(showSlug);
      const cleanSeason = season ? slugify(season) : null;
      const cleanEp = episode ? (episode.startsWith('e') || episode.startsWith('ep') ? episode : `e${episode}`) : 'e1';
      const filename = `${slugify(cleanEp)}.md`;

      relativePath = cleanSeason
        ? `tv/${cleanShowSlug}/${cleanSeason}/${filename}`
        : `tv/${cleanShowSlug}/${filename}`;

      let foundExistingEp = false;
      let existingFrontmatter: Record<string, any> = {};
      try {
        const fullEpPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullEpPath)) {
          const raw = fs.readFileSync(fullEpPath, 'utf8');
          existingFrontmatter = matter(raw).data;
          foundExistingEp = true;
        }
      } catch {}

      const frontmatterData: Record<string, any> = {
        videourl: cleanVideo,
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      else if (existingFrontmatter.title) frontmatterData.title = existingFrontmatter.title;

      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      else if (existingFrontmatter.deskripsi) frontmatterData.deskripsi = existingFrontmatter.deskripsi;

      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      else if (existingFrontmatter.image_url) frontmatterData.image_url = existingFrontmatter.image_url;

      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      else if (existingFrontmatter.rating !== undefined) frontmatterData.rating = Number(existingFrontmatter.rating);

      if (duration && duration.trim()) frontmatterData.duration = duration.trim();
      else if (existingFrontmatter.duration) frontmatterData.duration = existingFrontmatter.duration;

      if (subtitles && subtitles.trim()) frontmatterData.subtitles = subtitles.trim();
      else if (existingFrontmatter.subtitles) frontmatterData.subtitles = existingFrontmatter.subtitles;

      if (foundExistingEp) {
        isUpdate = true;
        if (frontmatterData.videourl !== existingFrontmatter.videourl) changedFields.push('URL Video');
        if (frontmatterData.image_url !== existingFrontmatter.image_url) changedFields.push('Image Poster');
        if (frontmatterData.rating !== existingFrontmatter.rating) changedFields.push('Rating');
        if (frontmatterData.duration !== existingFrontmatter.duration) changedFields.push('Durasi');
        if (frontmatterData.subtitles !== existingFrontmatter.subtitles) changedFields.push('Subtitles');
        if (frontmatterData.title && frontmatterData.title !== existingFrontmatter.title) changedFields.push('Judul');
        if (frontmatterData.deskripsi && frontmatterData.deskripsi !== existingFrontmatter.deskripsi) changedFields.push('Deskripsi');
        hasChanges = changedFields.length > 0;
      }

      fileContent = matter.stringify(content || '', frontmatterData);
    } else {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 });
    }

    // Save: try Local Filesystem, fallback to GitHub API on EROFS
    let wroteLocal = false;
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, fileContent, 'utf8');
      wroteLocal = true;
    } catch (fsErr: any) {
      if (fsErr.code !== 'EROFS' && !fsErr.message?.includes('read-only')) {
        throw fsErr;
      }
    }

    if (!wroteLocal) {
      if (!token) {
        return NextResponse.json(
          {
            error:
              'Sistem hosting Vercel bersifat Read-Only. Masukkan GitHub Personal Access Token di Pengaturan Admin (tombol ⚙️) untuk menyimpan langsung ke repositori secara live.',
            requiresToken: true,
          },
          { status: 400 }
        );
      }

      await saveGitHubFile(relativePath, fileContent, `cms: ${isUpdate ? 'update' : 'create'} ${relativePath}`, ghConfig);
    } else if (token) {
      try {
        await saveGitHubFile(relativePath, fileContent, `cms: ${isUpdate ? 'update' : 'create'} ${relativePath}`, ghConfig);
      } catch (ghErr: any) {
        console.warn('Local save succeeded; GitHub sync notice:', ghErr?.message);
      }
    }

    revalidateAll();
    return NextResponse.json({
      success: true,
      relativePath,
      isUpdate,
      hasChanges,
      changedFields,
    });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json({ error: error.message || 'Failed to create content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// PUT: Update existing markdown file
// ──────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const ghConfig = getGitHubConfig(request);
  const { token } = ghConfig;

  try {
    const body = await request.json();
    const { relativePath, frontmatter: newFrontmatter, content = '' } = body;

    if (!relativePath) {
      return NextResponse.json({ error: 'relativePath is required' }, { status: 400 });
    }

    const isMovie = relativePath.startsWith('video/');
    const isTV = relativePath.startsWith('tv/');

    if (!isMovie && !isTV) {
      return NextResponse.json({ error: 'Access denied outside content directories' }, { status: 403 });
    }

    // Clean empty values and sanitize frontmatter
    const cleanFrontmatter: Record<string, any> = {};
    for (const [key, val] of Object.entries(newFrontmatter || {})) {
      if (val !== undefined && val !== null && val !== '') {
        if (key === 'tmdb_id') {
          const ext = extractTmdbIdAndType(String(val));
          cleanFrontmatter[key] = ext.id ? Number(ext.id) : (isNaN(Number(val)) ? val : Number(val));
        } else if (key === 'videourl' || key === 'video_url') {
          cleanFrontmatter[key] = cleanVideoUrl(String(val)) || String(val).trim();
        } else if (key === 'rating' || key === 'episode_number' || key === 'season_number') {
          cleanFrontmatter[key] = isNaN(Number(val)) ? val : Number(val);
        } else if (key === 'featured') {
          cleanFrontmatter[key] = Boolean(val);
        } else {
          cleanFrontmatter[key] = val;
        }
      } else if (key === 'featured') {
        cleanFrontmatter[key] = false;
      }
    }

    const fileContent = matter.stringify(content || '', cleanFrontmatter);

    // Save: try Local Filesystem, fallback to GitHub API on EROFS
    let wroteLocal = false;
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, fileContent, 'utf8');
      wroteLocal = true;
    } catch (fsErr: any) {
      if (fsErr.code !== 'EROFS' && !fsErr.message?.includes('read-only')) {
        throw fsErr;
      }
    }

    if (!wroteLocal) {
      if (!token) {
        return NextResponse.json(
          {
            error:
              'Sistem hosting Vercel bersifat Read-Only. Masukkan GitHub Personal Access Token di Pengaturan Admin (tombol ⚙️) untuk menyimpan langsung ke repositori secara live.',
            requiresToken: true,
          },
          { status: 400 }
        );
      }

      await saveGitHubFile(relativePath, fileContent, `cms: update ${relativePath}`, ghConfig);
    } else if (token) {
      try {
        await saveGitHubFile(relativePath, fileContent, `cms: update ${relativePath}`, ghConfig);
      } catch (ghErr: any) {
        console.warn('Local update succeeded; GitHub sync notice:', ghErr?.message);
      }
    }

    revalidateAll();
    return NextResponse.json({ success: true, relativePath });
  } catch (error: any) {
    console.error('Error updating content:', error);
    return NextResponse.json({ error: error.message || 'Failed to update content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// DELETE: Delete markdown file(s) or TV folder(s) (supports single & batch)
// ──────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const ghConfig = getGitHubConfig(request);
  const { token } = ghConfig;

  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path');
    let pathsToDelete: string[] = [];

    if (pathParam) {
      pathsToDelete = [pathParam];
    } else {
      try {
        const body = await request.json().catch(() => ({}));
        if (Array.isArray(body.paths)) {
          pathsToDelete = body.paths;
        } else if (body.path) {
          pathsToDelete = [body.path];
        }
      } catch {}
    }

    if (pathsToDelete.length === 0) {
      return NextResponse.json({ error: 'Path parameter or paths array is required' }, { status: 400 });
    }

    for (const relativePath of pathsToDelete) {
      const isMovie = relativePath.startsWith('video/');
      const isTV = relativePath.startsWith('tv/');

      if (!isMovie && !isTV) {
        continue;
      }

      let deletedLocal = false;
      try {
        const fullPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          deletedLocal = true;
        }
      } catch (fsErr: any) {
        if (fsErr.code !== 'EROFS' && !fsErr.message?.includes('read-only')) {
          throw fsErr;
        }
      }

      if (!deletedLocal) {
        if (!token) {
          return NextResponse.json(
            {
              error:
                'Sistem hosting Vercel bersifat Read-Only. Masukkan GitHub Personal Access Token di Pengaturan Admin (tombol ⚙️) untuk menghapus langsung di repositori secara live.',
              requiresToken: true,
            },
            { status: 400 }
          );
        }

        await deleteGitHubFile(relativePath, `cms: delete ${relativePath}`, ghConfig);
      } else if (token) {
        try {
          await deleteGitHubFile(relativePath, `cms: delete ${relativePath}`, ghConfig);
        } catch (ghErr: any) {
          console.warn('Local delete succeeded; GitHub sync notice:', ghErr?.message);
        }
      }
    }

    revalidateAll();
    return NextResponse.json({ success: true, count: pathsToDelete.length });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete content' }, { status: 500 });
  }
}
