import type { Asset } from '../types/domain';
import { db } from './db';
import { isLocalOnly, urlKnowledge } from './adapters/router';
import { fetchPageMeta } from './adapters/toolAdapter';

export interface PageEvidenceProgress { done: number; total: number; }

// Only collect an unauthenticated public page. Account and subscription links stay untouched.
export function pageEvidenceUrl(asset: Asset): string | null {
  if (asset.assetType === 'private' || isLocalOnly(asset)) return null;
  try {
    const url = new URL(asset.url);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const path = decodeURIComponent(url.pathname);
    if (/(?:^|\/)(?:login|signin|sign-in|logout|auth|oauth|account|dashboard|settings|admin|user|users|panel|subscribe|subscription|token|invite)(?:\/|$|[._-])/i.test(path)) return null;
    if ([...url.searchParams.keys()].some(key => /token|secret|password|passwd|auth|session|credential|key|signature|code/i.test(key))) return null;
    // Removing content IDs would fetch a different resource (e.g. a video or document).
    if ([...url.searchParams.keys()].some(key => !/^(utm_.+|fbclid|gclid|msclkid)$/i.test(key))) return null;
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

export function needsPageEvidence(asset: Asset, now = Date.now()): boolean {
  if (!pageEvidenceUrl(asset)) return false;
  // Keep existing original material, e.g. GitHub README, rather than replace it with a short description.
  if (asset.sourceText?.trim() && !asset.pageEvidence) return false;
  const ttl = asset.pageEvidence?.status === 'ready' ? 7 * 86_400_000 : 86_400_000;
  return !asset.pageEvidence || now - asset.pageEvidence.checkedAt >= ttl;
}

function permissionOrigin(url: string): string {
  const page = new URL(url);
  return `${page.protocol}//${page.hostname}/*`;
}

// 只保留网站已授权的收藏（不弹窗）；用于导入后、打开侧栏时自动读取。
export async function permittedForEvidence(assets: Asset[]): Promise<Asset[]> {
  const pending = assets.filter(asset => needsPageEvidence(asset));
  const origins = [...new Set(pending.map(asset => permissionOrigin(pageEvidenceUrl(asset)!)))];
  const granted = new Set<string>();
  await Promise.all(origins.map(async origin => {
    try { if (await chrome.permissions.contains({ origins: [origin] })) granted.add(origin); } catch { /* 无法确认视为未授权 */ }
  }));
  return pending.filter(asset => granted.has(permissionOrigin(pageEvidenceUrl(asset)!)));
}

// Call directly from the click/Enter handler, before awaiting anything, to retain the user gesture.
// extraOrigins 合并进同一次申请（例如 GitHub API），一次点击只能弹一次权限框。
export function requestPageEvidenceAccess(assets: Asset[], extraOrigins: string[] = []): Promise<boolean> {
  const origins = [...new Set([
    ...assets.filter(asset => needsPageEvidence(asset)).map(asset => permissionOrigin(pageEvidenceUrl(asset)!)),
    ...extraOrigins
  ])];
  if (!origins.length) return Promise.resolve(true);
  try { return chrome.permissions.request({ origins }).catch(() => false); } catch { return Promise.resolve(false); }
}

export async function collectPageEvidence(
  assets: Asset[], signal?: AbortSignal, onProgress?: (progress: PageEvidenceProgress) => void,
  isActive: () => boolean = () => true
): Promise<void> {
  const pending = assets.filter(asset => needsPageEvidence(asset));
  let index = 0, done = 0;
  const active = () => !signal?.aborted && isActive();
  onProgress?.({ done, total: pending.length });
  const worker = async () => {
    while (active() && index < pending.length) {
      const original = pending[index++];
      const current = await db.assets.get(original.id);
      const url = current && current.url === original.url && needsPageEvidence(current) ? pageEvidenceUrl(current) : null;
      if (current && url && active()) {
        let allowed = false;
        try { allowed = await chrome.permissions.contains({ origins: [permissionOrigin(url)] }); } catch { /* No permission: keep existing evidence. */ }
        if (allowed && active()) {
          // Re-read after permission checks so newly private/changed records cannot be fetched.
          const live = await db.assets.get(current.id);
          if (live && live.url === current.url && pageEvidenceUrl(live) === url && needsPageEvidence(live) && active()) {
            let sourceText = '', ogType = '', status: NonNullable<Asset['pageEvidence']>['status'] = 'unavailable';
            try {
              const meta = await fetchPageMeta(url, signal);
              ogType = meta.ogType;
              const gate = /^(?:just a moment|access denied|sign in|log in|登录|请登录|安全验证)/i;
              // 需要登录才能看、且不是知识库认识的公开产品（如 SaaS 应用入口）：多为内部系统，转为仅本机处理，不交给模型。
              const knownProduct = urlKnowledge(url).type !== undefined || urlKnowledge(url).tags.length > 0;
              if (meta.loginRequired && !knownProduct) status = 'login';
              else if (meta.description && !gate.test(meta.title) && !gate.test(meta.description)) {
                sourceText = [meta.description, meta.title].filter(Boolean).join('\n').slice(0, 700);
                status = 'ready';
              } else status = 'empty';
            } catch { /* Unreadable pages do not interrupt model/local search. */ }
            if (active()) await db.transaction('rw', db.assets, async () => {
              const latest = await db.assets.get(live.id);
              if (!active() || !latest || latest.url !== live.url || pageEvidenceUrl(latest) !== url || latest.sourceText !== live.sourceText || JSON.stringify(latest.pageEvidence) !== JSON.stringify(live.pageEvidence)) return;
              const changes: Partial<Asset> = { pageEvidence: { checkedAt: Date.now(), status, ...(ogType ? { ogType } : {}) } };
              if (status === 'login') changes.enrichmentStatus = 'skipped';
              if (sourceText && sourceText !== latest.sourceText) {
                changes.sourceText = sourceText;
                changes.collectionJudgments = undefined;
                changes.tagJudgments = undefined;
              }
              // Do not change visible title/summary/features, manual choices or card ordering.
              await db.assets.update(latest.id, changes);
            });
          }
        }
      }
      done++;
      if (active()) onProgress?.({ done, total: pending.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
}
