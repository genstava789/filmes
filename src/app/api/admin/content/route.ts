import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { slugify } from '@/lib/urls';

const VIDEO_DIR = path.join(process.cwd(), 'video');
const TV_DIR = path.join(process.cwd(), 'tv');

function ensureDirectories() {
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
  if (!fs.existsSync(TV_DIR)) fs.mkdirSync(TV_DIR, { recursive: true });
}

function sanitizePath(relativePath: string, baseDir: string): string | null {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(baseDir, normalized);
  if (!fullPath.startsWith(baseDir)) {
    return null;
  }
  return fullPath;
}

// ──────────────────────────────────────────
// GET: Fetch all custom movies and TV series
// ──────────────────────────────────────────
export async function GET() {
  ensureDirectories();

  try {
    // 1. Movies in video/
    const movieFiles = fs.readdirSync(VIDEO_DIR).filter((f) => /\.(md|markdown)$/i.test(f));
    const movies = movieFiles.map((file) => {
      const fullPath = path.join(VIDEO_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(raw);
      return {
        filename: file,
        slug: file.replace(/\.(md|markdown)$/i, ''),
        relativePath: `video/${file}`,
        frontmatter: data,
        content: content || '',
      };
    });

    // 2. TV Series in tv/
    const tvDirs = fs.readdirSync(TV_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    const tvShows = tvDirs.map((showDir) => {
      const showPath = path.join(TV_DIR, showDir);
      let indexFrontmatter: any = {};
      let indexContent = '';

      const indexPath = fs.existsSync(path.join(showPath, '_index.md'))
        ? path.join(showPath, '_index.md')
        : fs.existsSync(path.join(showPath, 'index.md'))
        ? path.join(showPath, 'index.md')
        : null;

      if (indexPath) {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const parsed = matter(raw);
        indexFrontmatter = parsed.data;
        indexContent = parsed.content || '';
      }

      // Read episodes
      const episodes: any[] = [];
      const entries = fs.readdirSync(showPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === '_index.md' || entry.name === 'index.md') continue;

        if (entry.isDirectory()) {
          // Season folder e.g. s1
          const seasonFolder = entry.name;
          const seasonPath = path.join(showPath, seasonFolder);
          const epFiles = fs.readdirSync(seasonPath).filter((f) => /\.(md|markdown)$/i.test(f));

          for (const epFile of epFiles) {
            const raw = fs.readFileSync(path.join(seasonPath, epFile), 'utf8');
            const { data, content } = matter(raw);
            episodes.push({
              showSlug: showDir,
              seasonFolder,
              filename: epFile,
              slug: epFile.replace(/\.(md|markdown)$/i, ''),
              relativePath: `tv/${showDir}/${seasonFolder}/${epFile}`,
              frontmatter: data,
              content: content || '',
            });
          }
        } else if (/\.(md|markdown)$/i.test(entry.name)) {
          // Flat episode file e.g. e1.md
          const raw = fs.readFileSync(path.join(showPath, entry.name), 'utf8');
          const { data, content } = matter(raw);
          episodes.push({
            showSlug: showDir,
            seasonFolder: null,
            filename: entry.name,
            slug: entry.name.replace(/\.(md|markdown)$/i, ''),
            relativePath: `tv/${showDir}/${entry.name}`,
            frontmatter: data,
            content: content || '',
          });
        }
      }

      return {
        showSlug: showDir,
        relativePath: `tv/${showDir}/_index.md`,
        frontmatter: indexFrontmatter,
        content: indexContent,
        episodes,
      };
    });

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

  try {
    const body = await request.json();
    const { contentType = 'movie' } = body; // 'movie' | 'tv_show' | 'tv_episode'

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
      const fullPath = path.join(VIDEO_DIR, filename);

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

      const fileContent = matter.stringify(content || '', frontmatterData);
      fs.writeFileSync(fullPath, fileContent, 'utf8');

      return NextResponse.json({ success: true, relativePath: `video/${filename}`, slug: fileSlug });
    }

    if (contentType === 'tv_show') {
      const { tmdb_id, title, desc, poster, rating, featured, showSlug, content = '' } = body;

      if (!tmdb_id) {
        return NextResponse.json({ error: 'tmdb_id is required' }, { status: 400 });
      }

      const cleanShowSlug = showSlug ? slugify(showSlug) : title ? slugify(title) : `tv-${tmdb_id}`;
      const showPath = path.join(TV_DIR, cleanShowSlug);
      if (!fs.existsSync(showPath)) {
        fs.mkdirSync(showPath, { recursive: true });
      }

      const indexPath = path.join(showPath, '_index.md');
      const frontmatterData: Record<string, any> = {
        tmdb_id: Number(tmdb_id),
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      if (featured) frontmatterData.featured = true;

      const fileContent = matter.stringify(content || '', frontmatterData);
      fs.writeFileSync(indexPath, fileContent, 'utf8');

      return NextResponse.json({ success: true, relativePath: `tv/${cleanShowSlug}/_index.md`, showSlug: cleanShowSlug });
    }

    if (contentType === 'tv_episode') {
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

      const targetDir = cleanSeason
        ? path.join(TV_DIR, cleanShowSlug, cleanSeason)
        : path.join(TV_DIR, cleanShowSlug);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fullPath = path.join(targetDir, filename);
      const frontmatterData: Record<string, any> = {
        videourl: videourl.trim(),
      };

      if (title && title.trim()) frontmatterData.title = title.trim();
      if (desc && desc.trim()) frontmatterData.deskripsi = desc.trim();
      if (poster && poster.trim()) frontmatterData.image_url = poster.trim();
      if (rating !== undefined && rating !== null && rating !== '') frontmatterData.rating = Number(rating);
      if (duration && duration.trim()) frontmatterData.duration = duration.trim();
      if (subtitles && subtitles.trim()) frontmatterData.subtitles = subtitles.trim();

      const fileContent = matter.stringify(content || '', frontmatterData);
      fs.writeFileSync(fullPath, fileContent, 'utf8');

      const relativePath = cleanSeason
        ? `tv/${cleanShowSlug}/${cleanSeason}/${filename}`
        : `tv/${cleanShowSlug}/${filename}`;

      return NextResponse.json({ success: true, relativePath });
    }

    return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json({ error: error.message || 'Failed to create content' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// PUT: Update existing markdown file
// ──────────────────────────────────────────
export async function PUT(request: NextRequest) {
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

    const baseDir = isMovie ? VIDEO_DIR : TV_DIR;
    const subPath = isMovie ? relativePath.replace(/^video\//, '') : relativePath.replace(/^tv\//, '');
    const fullPath = sanitizePath(subPath, baseDir);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Target file not found' }, { status: 404 });
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
    fs.writeFileSync(fullPath, fileContent, 'utf8');

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

    const baseDir = isMovie ? VIDEO_DIR : TV_DIR;
    const subPath = isMovie ? relativePath.replace(/^video\//, '') : relativePath.replace(/^tv\//, '');
    const fullPath = sanitizePath(subPath, baseDir);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Target file or folder not found' }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ success: true, message: `Successfully deleted ${relativePath}` });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete content' }, { status: 500 });
  }
}
