import { EN, LABELS_EN } from './en';

// 界面语言：中文为源文本，英文从 en.ts 查表；查不到时显示中文，不会出现空白。
// 新增界面文字时用 t('中文原文', { 参数 })，并在 en.ts 补英文。
export type Lang = 'zh' | 'en';
export type LanguagePreference = 'auto' | Lang;

export function detectLang(): Lang {
  const ui = ((globalThis as any).chrome?.i18n?.getUILanguage?.() || (globalThis as any).navigator?.language || 'zh').toLowerCase();
  return ui.startsWith('zh') ? 'zh' : 'en';
}

let current: Lang = detectLang();

export function setLanguage(preference: LanguagePreference = 'auto'): void {
  current = preference === 'auto' ? detectLang() : preference;
}

export function getLanguage(): Lang {
  return current;
}

export function t(text: string, params?: Record<string, string | number>): string {
  const template = current === 'en' ? EN[text] ?? text : text;
  return params ? template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? '')) : template;
}

// 内置标签、标签包、默认收藏集等名称：数据里保存中文原名（作为标识），显示时按语言翻译；用户自建的名称原样显示。
export function tLabel(label: string): string {
  if (current !== 'en') return label;
  const hash = label.startsWith('#') ? '#' : '';
  const name = hash ? label.slice(1) : label;
  return hash + (LABELS_EN[name] ?? name);
}
