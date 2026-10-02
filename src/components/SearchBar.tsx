import React from 'react';
import { Search, X, Sparkles, Loader2 } from 'lucide-react';
import { t } from '../i18n';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onSemanticSearch: () => void;
  onStop: () => void;
  onConfigure: () => void;
  modelReady: boolean;
  modelLabel: string;
  searching: boolean;
  publicCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSemanticSearch, onStop, onConfigure, modelReady, modelLabel, searching, publicCount,
  placeholder
}) => {
  return (
    <div className="relative px-4 pt-2 pb-1">
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white dark:bg-gray-800/80 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900 transition-all pr-1">
        <Search className="w-4 h-4 ml-3 shrink-0 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t('搜索收藏')}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && modelReady && value.trim() && !searching) onSemanticSearch(); }}
          placeholder={placeholder ?? t('描述想找的内容，如：把图片弄小的网站')}
          className="min-w-0 flex-1 pl-1 py-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label={t('清空搜索')}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {searching ? <button onClick={onStop} aria-label={t('停止智能搜索')} className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-brand-200 text-brand-700 dark:text-brand-300"><Loader2 className="w-3 h-3 animate-spin" />{t('停止')}</button> : <button onClick={modelReady ? onSemanticSearch : onConfigure} disabled={modelReady && (!value.trim() || publicCount === 0)} aria-label={modelReady ? t('智能搜索') : t('配置智能搜索')} title={!modelReady ? t('配置智能搜索') : !value.trim() ? t('输入想找的内容后启动智能搜索') : publicCount === 0 ? t('当前范围没有可关联的公开收藏') : t('由{model}重排本地搜索结果', { model: modelLabel })} className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-brand-600 text-white disabled:bg-brand-100 disabled:text-brand-700 disabled:cursor-not-allowed"><Sparkles className="w-3 h-3" />{t('智能搜索')}</button>}
      </div>
    </div>
  );
};
