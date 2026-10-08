export interface GitHubMeta {
  owner: string;
  repo: string;
  description: string;
  topics: string[];
  language: string;
  stars: number;
  readmeSnippet: string;
}

export const GITHUB_API_ORIGINS = ['https://api.github.com/*', 'https://raw.githubusercontent.com/*'];

// 只有会去拉 README 的公开仓库才需要这两个可选主机权限。
export function githubApiOriginsFor(assets: { url: string; assetType?: string }[]): string[] {
  return assets.some(asset => asset.assetType === 'repo' && parseGitHubUrl(asset.url)) ? GITHUB_API_ORIGINS : [];
}

async function canFetchGitHub(): Promise<boolean> {
  const browser = (globalThis as { chrome?: typeof chrome }).chrome;
  if (!browser?.permissions?.contains) return true;
  try { return await browser.permissions.contains({ origins: [...GITHUB_API_ORIGINS] }); } catch { return false; }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    }
  } catch (e) {}
  return null;
}

export async function fetchGitHubInfo(owner: string, repo: string): Promise<GitHubMeta> {
  let description = '';
  let topics: string[] = [];
  let language = '';
  let stars = 0;
  let readmeSnippet = '';

  // 未授权时安静跳过：自动分析没有点击手势，不能在这里弹权限；调用方在点击时已经申请过。
  if (!(await canFetchGitHub())) return { owner, repo, description, topics, language, stars, readmeSnippet };

  try {
    // 1. 获取基础仓库信息
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10_000)
    });
    if (res.ok) {
      const data = await res.json();
      description = data.description || '';
      topics = data.topics || [];
      language = data.language || '';
      stars = data.stargazers_count || 0;
    }

    // 2. 获取 README 摘要 (前 1000 字符)
    const readmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`, { signal: AbortSignal.timeout(10_000) });
    if (readmeRes.ok) {
      const text = await readmeRes.text();
      readmeSnippet = text.slice(0, 1000).replace(/<!--[\s\S]*?-->/g, '').trim();
    }
  } catch (err) {
    console.warn('GitHub fetch error (using fallback):', err);
  }

  return { owner, repo, description, topics, language, stars, readmeSnippet };
}
