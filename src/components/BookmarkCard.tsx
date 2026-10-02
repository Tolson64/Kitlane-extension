import React, { useRef, useState } from 'react';
import { Star, Edit3, Shield, Globe, Terminal, Copy, Check, RotateCw, ChevronDown, Plus, X } from 'lucide-react';
import { Asset, AssetType, USE_STATUS_LABELS } from '../types/domain';
import { MAX_SCENE_TAG_LENGTH, formatSceneTag, shortenSceneTagText } from '../utils/sceneTags';
import { getBookmarkFaviconUrl } from '../utils/favicon';
import { t, tLabel } from '../i18n';

interface BookmarkCardProps {
  asset: Asset;
  onOpenRunbook: (asset: Asset) => void;
  onReanalyze: (asset: Asset) => Promise<void>;
  onChangeType: (assetId: string, newType: AssetType) => Promise<void>;
  onUpdateTags?: (assetId: string, newScenes: string[]) => Promise<void>;
  onOpenAsset: (asset: Asset) => Promise<void>;
  onOrganize?: (asset: Asset) => void;
  collectionNames?: string[];
}

// name 为中文原名，显示时翻译；label 前带图标。
const TYPE_CONFIG: Record<AssetType, { label: string; name: string; color: string }> = {
  tool: { label: '🛠️ 工具', name: '工具', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  repo: { label: '🐙 仓库', name: '仓库', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  inspiration: { label: '🎨 灵感', name: '灵感', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  article: { label: '📑 资料', name: '资料', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  private: { label: '🔒 私密', name: '私密', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  other: { label: '未分类', name: '未分类', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

const typeLabel = (config: { label: string; name: string }) => config.label.replace(config.name, tLabel(config.name));

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  asset,
  onOpenRunbook,
  onReanalyze,
  onChangeType,
  onUpdateTags,
  onOpenAsset,
  onOrganize,
  collectionNames = []
}) => {
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [failedFaviconUrl, setFailedFaviconUrl] = useState<string>();
  const [showAllTags, setShowAllTags] = useState(false);
  const isComposingTag = useRef(false);

  const copyCloneCmd = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`git clone ${asset.url}.git`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSingleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzing(true);
    try {
      await onReanalyze(asset);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectType = async (e: React.MouseEvent, type: AssetType) => {
    e.stopPropagation();
    setShowTypeMenu(false);
    await onChangeType(asset.id, type);
  };

  const handleRemoveTag = async (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    if (!onUpdateTags) return;
    const updated = (asset.scenes || []).filter((_, idx) => idx !== indexToRemove);
    await onUpdateTags(asset.id, updated);
  };

  const handleAddTagSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.type === 'keydown' && ((e as React.KeyboardEvent).key !== 'Enter' || (e as React.KeyboardEvent).nativeEvent.isComposing)) return;
    e.preventDefault();
    const cleanTag = formatSceneTag(newTagInput);
    if (!cleanTag || !onUpdateTags) {
      setIsAddingTag(false);
      return;
    }
    const updated = [...(asset.scenes || []), cleanTag];
    await onUpdateTags(asset.id, updated);
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const openUrl = () => {
    void onOpenAsset(asset);
    window.open(asset.url, '_blank', 'noopener,noreferrer');
  };

  const currentType = TYPE_CONFIG[asset.assetType] || TYPE_CONFIG.tool;
  const faviconUrl = getBookmarkFaviconUrl(asset.url);

  return (
    <div
      onClick={openUrl}
      className="group relative p-3 mx-4 my-2 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/60 hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* 头部：Favicon + 标题 + 分类切换 + 操作按钮 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span aria-hidden="true" className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400">
            {faviconUrl && faviconUrl !== failedFaviconUrl ? (
              <img src={faviconUrl} alt="" width={16} height={16} loading="lazy" decoding="async" className="w-4 h-4 object-contain" onError={() => setFailedFaviconUrl(faviconUrl)} />
            ) : asset.isPrivate ? (
              <Shield className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
          </span>
          <h3 title={asset.title || asset.url} className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 break-words group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {asset.title || asset.url}
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {/* 大类徽章与手动纠错切换下拉菜单 */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTypeMenu(!showTypeMenu);
              }}
              title={t('点击纠偏更改所属大类')}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${currentType.color}`}
            >
              <span>{typeLabel(currentType)}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showTypeMenu && (
              <div className="absolute right-0 top-6 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[90px]">
                {(Object.keys(TYPE_CONFIG) as AssetType[]).map((type) => (
                  <button
                    key={type}
                    onClick={(e) => handleSelectType(e, type)}
                    className="w-full text-left px-2.5 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <span>{typeLabel(TYPE_CONFIG[type])}</span>
                    {asset.assetType === type && <Check className="w-3 h-3 text-brand-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 重新分析按钮 */}
          <button
            onClick={handleSingleReanalyze}
            disabled={analyzing || asset.enrichmentStatus === 'processing'}
            title={t('分析此公开网页（需配置模型并允许分析）')}
            className="p-1 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${analyzing || asset.enrichmentStatus === 'processing' ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          {/* 实操备忘录 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenRunbook(asset);
            }}
            title={t('查看或编写实操避坑备忘 (Runbook)')}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 一句话功能提炼 */}
      {asset.summary && asset.summary !== asset.title && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {asset.summary}
        </p>
      )}

      {/* GitHub 专有属性 */}
      {asset.assetType === 'repo' && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          {asset.stars !== undefined && asset.stars > 0 && (
            <span className="flex items-center gap-1 font-mono">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              {asset.stars.toLocaleString()}
            </span>
          )}
          {asset.language && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
              {asset.language}
            </span>
          )}
          <button
            onClick={copyCloneCmd}
            className="hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            title={t('复制 git clone')}
          >
            {copied ? <Check className="w-3 h-3 text-brand-500" /> : <Copy className="w-3 h-3" />}
            <span>Clone</span>
          </button>
        </div>
      )}

      {/* 场景标签胶囊（支持悬停删除与自由添加） */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(showAllTags ? (asset.scenes || []) : (asset.scenes || []).slice(0, 4)).map((scene, i) => (
          <span
            key={i}
            title={scene}
            className="group/tag relative inline-flex items-center text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300 transition-colors"
          >
            <span className="whitespace-nowrap">{tLabel(formatSceneTag(scene))}</span>
            <button
              onClick={(e) => handleRemoveTag(e, i)}
              title={t('删除此标签')}
              className="absolute -right-1 -top-1 p-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 opacity-0 group-hover/tag:opacity-100 focus:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {(asset.scenes || []).length > 4 && <button onClick={e => { e.stopPropagation(); setShowAllTags(!showAllTags); }} className="text-[10px] text-gray-500">{showAllTags ? t('收起') : t('更多 {n}', { n: (asset.scenes || []).length - 4 })}</button>}

        {/* 动态添加标签 */}
        {isAddingTag ? (
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1"
          >
            <input
              type="text"
              autoFocus
              value={newTagInput}
              onChange={(e) => setNewTagInput(isComposingTag.current ? e.target.value : shortenSceneTagText(e.target.value))}
              onCompositionStart={() => { isComposingTag.current = true; }}
              onCompositionEnd={(e) => {
                isComposingTag.current = false;
                setNewTagInput(shortenSceneTagText(e.currentTarget.value));
              }}
              onKeyDown={handleAddTagSubmit}
              onBlur={() => setIsAddingTag(false)}
              placeholder={t('中文最多 {n} 字', { n: MAX_SCENE_TAG_LENGTH })}
              aria-label={t('标签名，中文最多 {n} 字', { n: MAX_SCENE_TAG_LENGTH })}
              className="text-[10px] px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none w-20"
            />
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOrganize) onOrganize(asset); else setIsAddingTag(true);
            }}
            title={onOrganize ? t('整理收藏集与标签') : t('添加自定义场景标签')}
            aria-label={onOrganize ? t('整理收藏集与标签') : t('添加自定义场景标签')}
            className="text-[10px] text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
          >
            <Plus className="w-2.5 h-2.5 mr-0.5" />
            <span>{onOrganize ? t('整理') : t('标签')}</span>
          </button>
        )}
      </div>
      {collectionNames.length > 0 && <p className="mt-1.5 text-[10px] text-gray-500 truncate" title={collectionNames.map(tLabel).join(' · ')}>{t('收藏集：')}{collectionNames.map(tLabel).join(' · ')}</p>}
      {asset.useStatus && asset.useStatus !== 'unmarked' && <p className="mt-1 text-[10px] text-gray-500">{t('状态：')}{t(USE_STATUS_LABELS[asset.useStatus])}</p>}

      {/* 个人避坑/实操速查简略预览 */}
      {asset.runbookNotes && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1.5 font-mono">
          <Terminal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="truncate">{asset.runbookNotes}</span>
        </div>
      )}
    </div>
  );
};
