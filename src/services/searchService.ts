import MiniSearch from 'minisearch';
import type { Asset, SearchDocument } from '../types/domain';
import { USE_STATUS_LABELS } from '../types/domain';

// Grammatical filler should not make an approximate description match almost every bookmark.
const STOP_WORDS = new Set(['的', '了', '着', '过', '把', '被', '一个', '那个', '这个', '我', '我们', '你', '之前', '以前', 'the', 'a', 'an', 'of', 'and', 'or']);

// 中文分词与字母数字分词器
function customTokenizer(text: string): string[] {
  if (!text) return [];

  // 如果支持原生 Intl.Segmenter
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('zh-CN', { granularity: 'word' });
      const words: string[] = [];
      for (const seg of segmenter.segment(text)) {
        const clean = seg.segment.trim().toLowerCase();
        if (clean.length > 0 && !STOP_WORDS.has(clean) && !/^[\s,.;:!?，。！？#]+$/.test(clean)) {
          words.push(clean);
        }
      }
      return words;
    } catch (e) {}
  }

  // 降级正则与单字/双字切分
  const tokens: string[] = [];
  const latinMatches = text.toLowerCase().match(/[a-z0-9_-]+/g) || [];
  tokens.push(...latinMatches);

  // 中文字符双字切分
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  for (let i = 0; i < chineseChars.length - 1; i++) {
    tokens.push(chineseChars[i] + chineseChars[i + 1]);
  }
  tokens.push(...chineseChars);

  return Array.from(new Set(tokens)).filter(token => !STOP_WORDS.has(token));
}

export class SearchEngine {
  private miniSearch: MiniSearch<SearchDocument>;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'userTitle', 'scenesText', 'featuresText', 'summary', 'runbookText', 'statusText', 'url', 'sourceText', 'folderName'],
      storeFields: ['id', 'assetType'],
      tokenize: customTokenizer,
      searchOptions: {
        boost: {
          scenesText: 5,   // 场景标签最高权重
          featuresText: 3, // 核心功能次高
          title: 2,
          userTitle: 4,
          summary: 1.5,
          runbookText: 2
        },
        fuzzy: 0.2,
        prefix: true
      }
    });
  }

  // 重建索引
  indexAll(assets: Asset[]) {
    this.miniSearch.removeAll();
    const docs: SearchDocument[] = assets.map(a => ({
      id: a.id,
      title: a.title || '',
      userTitle: a.userTitle || '',
      url: a.url || '',
      assetType: a.assetType,
      scenesText: (a.scenes || []).join(' '),
      featuresText: (a.features || []).join(' '),
      summary: a.summary || '',
      runbookText: a.runbookNotes || '',
      statusText: USE_STATUS_LABELS[a.useStatus || 'unmarked'],
      sourceText: a.sourceText || '',
      folderName: a.folderName || ''
    }));
    if (docs.length > 0) this.miniSearch.addAll(docs);
  }

  // 搜索
  search(query: string, assetTypeFilter?: string): string[] {
    const q = query.trim();
    if (!q) return [];

    const results = this.miniSearch.search(q, {
      filter: assetTypeFilter ? (result) => result.assetType === assetTypeFilter : undefined
    });
    return results.map(r => r.id);
  }
}

export const searchEngine = new SearchEngine();
