import type { Asset, AssetType, Collection, TagPack, TagDefinition } from '../types/domain';
import { formatSceneTag, normalizeSceneTags } from '../utils/sceneTags';
import { detectAssetType, isLocalOnly, urlKnowledge } from './adapters/router';

// 公开收藏尚未被当前模型成功分析过（含待分析、失败、由其他模型分析过的），
// 或有带收录规则的收藏集还没对它做出有效判断（如用户新建或修改了收藏集）。
export function needsModelAnalysis(asset: Asset, modelKey: string, collections: Collection[] = []): boolean {
  if (isLocalOnly(asset) || asset.enrichmentStatus === 'processing' || asset.enrichmentStatus === 'skipped') return false;
  // 旧版记录里的 deepseek/glm/local_chat 与现在的通用大模型视为同一配置，避免升级后全部重新分析。
  const analyzed = asset.analyzedWith?.replace(/^(deepseek|glm|local_chat)\|/, 'custom|');
  if (asset.enrichmentStatus !== 'done' || analyzed !== modelKey) return true;
  return collections.some(c => !c.assetType && c.description.trim() && asset.collectionOverrides?.[c.id] === undefined &&
    asset.collectionJudgments?.[c.id]?.ruleVersion !== c.updatedAt);
}

export function evidenceText(asset: Asset): string {
  let url = '';
  try {
    const parsed = new URL(asset.url);
    url = decodeURIComponent(parsed.hostname + parsed.pathname);
  } catch {}
  // 不以模型生成的摘要、功能或个人备忘作为自动分类的原始证据。
  return [asset.title, asset.folderName, url, asset.sourceText].filter(Boolean).join('\n').toLowerCase();
}

export function matchesKeyword(text: string, keyword: string): boolean {
  const word = keyword.trim().toLowerCase();
  if (!word) return false;
  if (/[\u3400-\u9fff]/.test(word)) return text.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
}

// 标题、原收藏夹名和网址是强证据；抓取的网页简介等原始资料是弱证据，泛泛的短词容易误中。
function strongEvidenceText(asset: Asset): string {
  return evidenceText({ ...asset, sourceText: undefined });
}
// 足够具体的关键词：四字及以上的中文词，或英文词组 / 长词。
function isSpecificKeyword(keyword: string): boolean {
  return /[㐀-鿿]/.test(keyword) ? Array.from(keyword.trim()).length >= 4 : keyword.trim().includes(' ') || keyword.trim().length >= 8;
}

export function matchesTag(asset: Asset, tag: TagDefinition): boolean {
  if (tag.label === '代码仓库' && asset.assetType === 'repo') return true;
  let host = '';
  try { host = new URL(asset.url).hostname.toLowerCase(); } catch {}
  if ((tag.domains || []).some(domain => host === domain || host.endsWith(`.${domain}`))) return true;
  const strong = strongEvidenceText(asset);
  if (tag.keywords.some(keyword => matchesKeyword(strong, keyword))) return true;
  // 弱证据要求命中两个不同关键词，或一个具体的关键词。
  const weak = (asset.sourceText || '').toLowerCase();
  if (!weak) return false;
  const hits = tag.keywords.filter(keyword => matchesKeyword(weak, keyword));
  return hits.length >= 2 || hits.some(isSpecificKeyword);
}

export function effectiveTags(asset: Asset, packs: TagPack[]): string[] {
  if (asset.userEditedScenes) return normalizeSceneTags(asset.scenes);
  const known = new Set(urlKnowledge(asset.url).tags); // 网站知识库与路径规则给出的标签
  const matched: string[] = [];
  for (const pack of packs.filter(p => p.enabled)) {
    for (const tag of pack.tags) {
      const judgment = asset.tagJudgments?.[`${pack.id}:${tag.id}`];
      const valid = judgment?.ruleVersion === pack.updatedAt;
      if (valid && judgment.decision === 'no_match') continue;
      if ((valid && judgment.decision === 'match') || known.has(tag.label) || matchesTag(asset, tag)) matched.push(tag.label);
    }
  }
  return normalizeSceneTags([...(asset.scenes || []), ...matched]);
}

// 浏览器书签的根目录（不是用户自建的分类），各语言与浏览器的常见名称。
export const ROOT_FOLDERS = new Set(['', '书签栏', '其他书签', '移动设备书签', '书签菜单', 'Bookmarks bar', 'Bookmarks Bar', 'Other bookmarks', 'Other Bookmarks', 'Mobile bookmarks', 'Bookmarks Menu', 'Favorites bar', 'Favourites bar', '收藏夹栏', '个人收藏', 'Favorites', 'Favourites']);

// 整个收藏库的无模型分类结果（界面与评测共用）：
// 1. 类型：用户改过或模型判断过的沿用；否则按最新的网址规则实时判断，规则更新后旧收藏也随之更新。
// 2. 标签：effectiveTags。
// 3. 同文件夹推断：自建文件夹里至少 3 条收藏、过半带同一场景标签（或同一类型）时，补给还没有场景标签（或类型未分类）的收藏。
export function classifyLibrary(stored: Asset[], packs: TagPack[]): Asset[] {
  const enabledLabels = new Set(packs.filter(p => p.enabled).flatMap(p => p.tags.map(t => t.label)));
  const assets = stored.map(asset => {
    const isPrivate = isLocalOnly(asset);
    let assetType = asset.userEditedType ? asset.assetType : isPrivate ? 'private' : asset.analyzedWith ? asset.assetType : detectAssetType(asset.url);
    // 规则不认识的网站，用网页自己声明的类型（读取网页简介时获得）：文章、博客 → 资料 + 文章；视频 → 资料 + 视频。
    const og = asset.pageEvidence?.ogType || '';
    const ogTag = /^(article|blog)/.test(og) ? '文章' : og.startsWith('video') ? '视频' : '';
    if (ogTag && assetType === 'other' && !asset.userEditedType && !urlKnowledge(asset.url).type) assetType = 'article';
    const typed = { ...asset, isPrivate, assetType };
    const tags = effectiveTags(typed, packs);
    return { ...typed, scenes: ogTag && !asset.userEditedScenes && enabledLabels.has(ogTag) ? normalizeSceneTags([...tags, ogTag]) : tags };
  });
  const format = new Set((packs.find(p => p.id === 'general')?.tags || []).map(t => formatSceneTag(t.label)));
  const folders = new Map<string, Asset[]>();
  for (const asset of assets) {
    if (asset.folderName && !ROOT_FOLDERS.has(asset.folderName)) folders.set(asset.folderName, [...(folders.get(asset.folderName) || []), asset]);
  }
  const inferred = new Map<string, { tags: string[]; type?: AssetType }>();
  for (const members of folders.values()) {
    if (members.length < 3) continue;
    const majority = (count: number) => count >= 2 && count / members.length >= 0.5;
    const tagCount = new Map<string, number>();
    const typeCount = new Map<AssetType, number>();
    for (const m of members) {
      for (const tag of new Set(m.scenes)) if (!format.has(tag)) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      if (m.assetType !== 'other' && m.assetType !== 'private') typeCount.set(m.assetType, (typeCount.get(m.assetType) || 0) + 1);
    }
    const sharedTags = [...tagCount].filter(([, c]) => majority(c)).map(([t]) => t);
    const [topType, topCount] = [...typeCount].sort((a, b) => b[1] - a[1])[0] || [];
    const sharedType = topType && majority(topCount) ? topType : undefined;
    for (const m of members) {
      const tags = !m.userEditedScenes && !m.scenes.some(t => !format.has(t)) ? sharedTags : [];
      // 只给规则完全不认识的网址补类型；知识库明确判为「其他」的（如平台首页）不覆盖。
      const type = m.assetType === 'other' && !m.userEditedType && !urlKnowledge(m.url).type ? sharedType : undefined;
      if (tags.length || type) inferred.set(m.id, { tags, type });
    }
  }
  return assets.map(asset => {
    const extra = inferred.get(asset.id);
    return extra ? { ...asset, scenes: normalizeSceneTags([...asset.scenes, ...extra.tags]), assetType: extra.type || asset.assetType } : asset;
  });
}

// 同一资产对象在同一组标签包下只计算一次（收藏集判断会对每个收藏集反复调用）。
const tagSetCache = new WeakMap<Asset, { packs: TagPack[]; tags: Set<string> }>();
function effectiveTagSet(asset: Asset, packs: TagPack[]): Set<string> {
  const cached = tagSetCache.get(asset);
  if (cached?.packs === packs) return cached.tags;
  const tags = new Set(effectiveTags(asset, packs).map(tag => tag.replace(/^#/, '')));
  tagSetCache.set(asset, { packs, tags });
  return tags;
}

export function belongsToCollection(asset: Asset, collection: Collection, packs: TagPack[]): boolean {
  const override = asset.collectionOverrides?.[collection.id];
  if (override !== undefined) return override;
  if (collection.assetType) return collection.assetType === 'private' ? isLocalOnly(asset) : asset.assetType === collection.assetType;
  const judgment = asset.collectionJudgments?.[collection.id];
  if (judgment?.ruleVersion === collection.updatedAt) return judgment.decision === 'match';
  // 收藏集建立在标签之上：标签分类的任何改进都会自动反映到收藏集，包括用户新建的。
  if (collection.tagLabels?.length) {
    const tags = effectiveTagSet(asset, packs);
    if (collection.tagLabels.some(label => tags.has(label))) return true;
  }
  return collection.keywords.some(word => matchesKeyword(evidenceText(asset), word));
}

// 根据收藏集名称和关键词推荐要自动收录的标签：先看标签名和所在标签包名，都没有时再看标签关键词。
const GENERIC_GRAMS = new Set(['工具', '资料', '资源', '网站', '收藏', '常用', '我的', '相关', '集合', '合集', '推荐']);
export function suggestTagLabels(name: string, keywords: string[], packs: TagPack[]): string[] {
  const text = [name, ...keywords].join(' ').toLowerCase();
  const grams = new Set<string>();
  for (const word of text.match(/[a-z0-9][a-z0-9+.#-]*/g) || []) if (word.length >= 2) grams.add(word);
  for (const run of text.match(/[㐀-鿿]+/g) || []) {
    if (run.length <= 2) grams.add(run);
    for (let i = 0; i + 2 <= run.length; i++) grams.add(run.slice(i, i + 2));
  }
  for (const gram of GENERIC_GRAMS) grams.delete(gram);
  if (!grams.size) return [];
  const has = (value: string) => [...grams].some(gram => /^[a-z0-9]/.test(gram) ? matchesKeyword(value.toLowerCase(), gram) : value.includes(gram));
  const enabled = packs.filter(p => p.enabled);
  const byName = enabled.flatMap(pack => pack.tags.filter(tag => has(pack.name) || has(tag.label)));
  const matched = byName.length ? byName : enabled.flatMap(pack => pack.tags.filter(tag => tag.keywords.some(has)));
  return [...new Set(matched.map(tag => tag.label))];
}

export function hasUncertainCollection(asset: Asset, collection: Collection): boolean {
  return asset.collectionOverrides?.[collection.id] === undefined &&
    asset.collectionJudgments?.[collection.id]?.ruleVersion === collection.updatedAt &&
    asset.collectionJudgments[collection.id].decision === 'uncertain';
}
