// 标签与名称长度：含中日韩文字时最多 8 个字；纯英文等拉丁文字最多 24 个字符（英文词更长）。
export const MAX_SCENE_TAG_LENGTH = 8;
export const MAX_LATIN_TAG_LENGTH = 24;

export function maxTagLength(text: string): number {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text) ? MAX_SCENE_TAG_LENGTH : MAX_LATIN_TAG_LENGTH;
}

export function shortenSceneTagText(value: string): string {
  const text = value.normalize('NFC').trim().replace(/^[#＃]+\s*/u, '').trim();
  return Array.from(text).slice(0, maxTagLength(text)).join('');
}

export function formatSceneTag(value: string): string {
  const text = shortenSceneTagText(value);
  return text ? `#${text}` : '';
}

export function normalizeSceneTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map(formatSceneTag)
    .filter(Boolean))];
}
