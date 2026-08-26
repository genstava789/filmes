import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/urls';
import { saveGitHubFile, deleteGitHubFile } from '@/lib/githubStorage';
import { getMovieDetails, getTVShowDetails, getImageUrl } from '@/lib/tmdb';

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

function getHeaderToken(req: NextRequest): string | null {
  return req.headers.get('x-github-token') || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

function revalidateAll() {
  try {
    revalidatePath('/', 'layout');
    revalidatePath('/movie/[id]', 'page');
    revalidatePath('/tv/[...slug]', 'page');
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

    return NextResponse.json({ movies, tvShows });
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
  const token = getHeaderToken(request);

  try {
    const body = await request.json();
    const { contentType = 'movie' } = body;

    let relativePath = '';
    let fileContent = '';

    if (contentType === 'movie') {
      const { tmdb_id, videourl, title, desc, poster, rating, featured, subtitles, content = '', slug } = body;

      if (!tmdb_id) {
        return NextResponse.json({ error: 'tmdb_id is required' }, { status: 400 });
      }
      if (!videourl) {
        return NextResponse.json({ error: 'videourl (url_video) is required' }, { status: 400 });
      }

      const fileSlug = slug ? slugify(slug) : title ? slugify(title) : `movie-${tmdb_id}`;
      const filename = `${fileSlug}.md`;
      relativePath = `video/${filename}`;

      const frontmatterData: Record<string, any> = {
        tmdb_id: Number(tmdb_id),
        videourl: videourl.trim(),
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      if (featured) frontmatterData.featured = true;
      if (subtitles && subtitles.trim()) frontmatterData.subtitles = subtitles.trim();

      fileContent = matter.stringify(content || '', frontmatterData);
    } else if (contentType === 'tv_show') {
      const { tmdb_id, title, desc, poster, rating, featured, showSlug, content = '' } = body;

      if (!tmdb_id) {
        return NextResponse.json({ error: 'tmdb_id is required' }, { status: 400 });
      }

      const cleanShowSlug = showSlug ? slugify(showSlug) : title ? slugify(title) : `tv-${tmdb_id}`;
      relativePath = `tv/${cleanShowSlug}/_index.md`;

      const frontmatterData: Record<string, any> = {
        tmdb_id: Number(tmdb_id),
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      if (featured) frontmatterData.featured = true;

      fileContent = matter.stringify(content || '', frontmatterData);
    } else if (contentType === 'tv_episode') {
      const { showSlug, season = 's1', episode = 'e1', videourl, title, desc, poster, rating, subtitles, duration, content = '' } = body;

      if (!showSlug) {
        return NextResponse.json({ error: 'showSlug is required for TV episode' }, { status: 400 });
      }
      if (!videourl) {
        return NextResponse.json({ error: 'videourl (url_video) is required for TV episode' }, { status: 400 });
      }

      const cleanShowSlug = slugify(showSlug);
      const cleanSeason = season ? slugify(season) : null;
      const cleanEp = episode ? (episode.startsWith('e') || episode.startsWith('ep') ? episode : `e${episode}`) : 'e1';
      const filename = `${slugify(cleanEp)}.md`;

      relativePath = cleanSeason
        ? `tv/${cleanShowSlug}/${cleanSeason}/${filename}`
        : `tv/${cleanShowSlug}/${filename}`;

      const frontmatterData: Record<string, any> = {
        videourl: videourl.trim(),
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      if (duration && duration.trim()) frontmatterData.duration = duration.trim();
      if (subtitles && subtitles.trim()) frontmatterData.subtitles = subtitles.trim();

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

    // If on serverless/Vercel (or token provided), commit directly to GitHub
    if (!wroteLocal || token) {
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

      await saveGitHubFile(relativePath, fileContent, `cms: create ${relativePath}`, { token });
    }

    revalidateAll();
    return NextResponse.json({ success: true, relativePath });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json({ error: error.message || 'Failed to create content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// PUT: Update existing markdown file
// ──────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const token = getHeaderToken(request);

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

    // Clean empty values from frontmatter
    const cleanFrontmatter: Record<string, any> = {};
    for (const [key, val] of Object.entries(newFrontmatter || {})) {
      if (val !== undefined && val !== null && val !== '') {
        if (key === 'tmdb_id' || key === 'rating' || key === 'episode_number' || key === 'season_number') {
          cleanFrontmatter[key] = isNaN(Number(val)) ? val : Number(val);
        } else {
          cleanFrontmatter[key] = val;
        }
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

    if (!wroteLocal || token) {
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

      await saveGitHubFile(relativePath, fileContent, `cms: update ${relativePath}`, { token });
    }

    revalidateAll();
    return NextResponse.json({ success: true, relativePath });
  } catch (error: any) {
    console.error('Error updating content:', error);
    return NextResponse.json({ error: error.message || 'Failed to update content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// DELETE: Delete a markdown file or TV folder
// ──────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const token = getHeaderToken(request);

  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');

    if (!relativePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const isMovie = relativePath.startsWith('video/');
    const isTV = relativePath.startsWith('tv/');

    if (!isMovie && !isTV) {
      return NextResponse.json({ error: 'Access denied outside content directories' }, { status: 403 });
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

    if (!deletedLocal || token) {
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

      await deleteGitHubFile(relativePath, `cms: delete ${relativePath}`, { token });
    }

    revalidateAll();
    return NextResponse.json({ success: true, message: `Successfully deleted ${relativePath}` });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete content' }, { status: 500 });
  }
}
