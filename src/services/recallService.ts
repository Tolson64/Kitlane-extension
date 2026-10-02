import type { Asset, TagPack } from '../types/domain';
import { SEARCH_ALIASES } from '../data/searchAliases';
import { matchesKeyword } from './classification';
import { isAdultContent } from './adapters/router';
import type { SearchEngine } from './searchService';
import { LABELS_EN } from '../i18n/en';

// 智能搜索只把本地排序前这么多条交给模型重排（研究报告：先本地召回，再模型重排）。
export const SMART_SEARCH_CANDIDATES = 30;

const ADULT_QUERY = ['黄色', '成人', '色情', '18禁', '黄片', '里番', 'av', 'porn', 'nsfw', 'xxx', 'hentai'];

// 查询里描述语气的词，不参与全文检索。
const QUERY_FILLER = new Set(['之前', '以前', '存的', '存过', '收藏', '收藏的', '那个', '一个', '一下', '一点', '一些', '的', '了', '网站', '工具', '软件', '平台', '在线', '怎么', '哪里', '在哪', '哪个', '可以', '能', '用来', '用于', '帮我', '我', '想', '找', '查', '看', '做', '用', '有', '个', '把', '给', '跟', '和', '与', '时', '上', '下', '里', '吗', '呢']);

function segment(text: string): string[] {
  const Segmenter = (Intl as any).Segmenter;
  if (Segmenter) return [...new Segmenter('zh-CN', { granularity: 'word' }).segment(text)].map((s: any) => s.segment.trim()).filter(Boolean);
  return text.split(/\s+/).filter(Boolean);
}

function contains(text: string, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (!w) return false;
  return /[㐀-鿿]/.test(w) ? text.includes(w) : matchesKeyword(text, w);
}

// 从查询中识别想要的标签：别名表 + 标签名与关键词直接出现。资源格式类标签（通用资源包）权重减半。
export function queryTags(query: string, packs: TagPack[]): Map<string, number> {
  const q = query.toLowerCase();
  const enabled = packs.filter(p => p.enabled);
  const exists = new Set(enabled.flatMap(p => p.tags.map(t => t.label)));
  const format = new Set(enabled.find(p => p.id === 'general')?.tags.map(t => t.label) || []);
  const weights = new Map<string, number>();
  const add = (label: string) => { if (exists.has(label)) weights.set(label, format.has(label) ? 0.5 : 1); };
  for (const [any, withAny, tags] of SEARCH_ALIASES) {
    if (any.split('|').some(w => contains(q, w)) && (!withAny || withAny.split('|').some(w => contains(q, w)))) tags.split(',').forEach(add);
  }
  for (const pack of enabled) for (const tag of pack.tags) {
    // 也接受标签的英文名（如 image editing → 图片处理），英文界面与英文查询都可用。
    const english = LABELS_EN[tag.label]?.toLowerCase();
    if (contains(q, tag.label) || (english && contains(q, english)) || tag.keywords.some(k => Array.from(k).length >= 2 && contains(q, k))) add(tag.label);
  }
  return weights;
}

// 本地排序（不调用模型）：全文检索、标签意图、整句子串三路结果按 RRF 融合（k=60）。
// 同时用于普通搜索结果和智能搜索的候选初筛。只返回至少命中一路的收藏。
export function rankLocally(query: string, assets: Asset[], packs: TagPack[], engine: SearchEngine): Asset[] {
  const q = query.trim().normalize('NFC').toLowerCase();
  if (!q) return assets;
  const inScope = new Map(assets.map(a => [a.id, a]));
  const lists: { ids: string[]; weight: number }[] = [];

  const terms = segment(q).filter(t => !QUERY_FILLER.has(t));
  if (terms.length) lists.push({ ids: engine.search(terms.join(' ')).filter(id => inScope.has(id)), weight: 1 });

  const wanted = queryTags(q, packs);
  if (wanted.size) {
    const scored = assets.map(a => ({ id: a.id, score: (a.scenes || []).reduce((s, t) => s + (wanted.get(t.replace(/^#/, '')) || 0), 0) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    lists.push({ ids: scored.map(x => x.id), weight: 1 });
  }

  // 成人内容只在本机处理、不交给模型，因此用本地规则直接响应这类查询。
  if (ADULT_QUERY.some(word => contains(q, word))) {
    lists.push({ ids: assets.filter(a => isAdultContent(a.url, a.title)).map(a => a.id), weight: 1 });
  }

  const substring = assets.filter(a => [a.title, a.userTitle, a.summary, (a.scenes || []).join(' '), (a.features || []).join(' '), a.runbookNotes, a.sourceText, a.folderName, a.url]
    .filter(Boolean).join(' ').toLowerCase().includes(q));
  lists.push({ ids: substring.map(a => a.id), weight: 0.5 });

  const score = new Map<string, number>();
  for (const { ids, weight } of lists) ids.forEach((id, rank) => score.set(id, (score.get(id) || 0) + weight / (60 + rank)));
  return [...score].sort((a, b) => b[1] - a[1]).map(([id]) => inScope.get(id)!);
}
