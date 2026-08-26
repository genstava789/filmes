/**
 * GitHub REST API Client for Serverless / Vercel Live CMS operations.
 * Bypasses EROFS (Read-only filesystem) by committing directly to the GitHub repository.
 */

const DEFAULT_OWNER = process.env.GITHUB_OWNER || 'genstava789';
const DEFAULT_REPO = process.env.GITHUB_REPO || 'filmes';
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main';

export interface GitHubOptions {
  owner?: string;
  repo?: string;
  branch?: string;
  token?: string | null;
}

export function getEffectiveToken(customToken?: string | null): string | null {
  return customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

/**
 * Gets a file from GitHub repository
 */
export async function getGitHubFile(filePath: string, options: GitHubOptions = {}) {
  const token = getEffectiveToken(options.token);
  if (!token) throw new Error('GitHub token is required on Vercel to access files via API');

  const owner = options.owner || DEFAULT_OWNER;
  const repo = options.repo || DEFAULT_REPO;
  const branch = options.branch || DEFAULT_BRANCH;
  const cleanPath = filePath.replace(/^\/+/, '');

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'LeviStream-CMS',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');

  return {
    sha: data.sha,
    content,
    path: data.path,
  };
}

/**
 * Creates or updates a file in GitHub repository
 */
export async function saveGitHubFile(
  filePath: string,
  fileContent: string,
  commitMessage: string,
  options: GitHubOptions = {}
) {
  const token = getEffectiveToken(options.token);
  if (!token) throw new Error('GitHub token is required on Vercel to save content');

  const owner = options.owner || DEFAULT_OWNER;
  const repo = options.repo || DEFAULT_REPO;
  const branch = options.branch || DEFAULT_BRANCH;
  const cleanPath = filePath.replace(/^\/+/, '');

  // 1. Get existing file SHA if it exists
  let sha: string | undefined;
  try {
    const existing = await getGitHubFile(cleanPath, options);
    if (existing) {
      sha = existing.sha;
    }
  } catch {
    // If not found or error, sha remains undefined (new file)
  }

  // 2. Put file to GitHub API
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
  const base64Content = Buffer.from(fileContent, 'utf8').toString('base64');

  const bodyPayload: any = {
    message: commitMessage || `cms: update ${cleanPath}`,
    content: base64Content,
    branch,
  };

  if (sha) {
    bodyPayload.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'LeviStream-CMS',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to commit to GitHub: ${res.status}`);
  }

  return await res.json();
}

/**
 * Deletes a file in GitHub repository
 */
export async function deleteGitHubFile(
  filePath: string,
  commitMessage: string,
  options: GitHubOptions = {}
) {
  const token = getEffectiveToken(options.token);
  if (!token) throw new Error('GitHub token is required on Vercel to delete content');

  const owner = options.owner || DEFAULT_OWNER;
  const repo = options.repo || DEFAULT_REPO;
  const branch = options.branch || DEFAULT_BRANCH;
  const cleanPath = filePath.replace(/^\/+/, '');

  // 1. Get file SHA
  const existing = await getGitHubFile(cleanPath, options);
  if (!existing) {
    throw new Error(`File ${cleanPath} not found on GitHub`);
  }

  // 2. Delete file via GitHub API
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'LeviStream-CMS',
    },
    body: JSON.stringify({
      message: commitMessage || `cms: delete ${cleanPath}`,
      sha: existing.sha,
      branch,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete from GitHub: ${res.status}`);
  }

  return await res.json();
}
