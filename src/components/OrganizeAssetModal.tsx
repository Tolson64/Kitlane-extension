import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Asset, Collection, TagPack } from '../types/domain';
import { USE_STATUS_LABELS, type UseStatus } from '../types/domain';
import { belongsToCollection } from '../services/classification';
import { db } from '../services/db';
import { formatSceneTag, shortenSceneTagText } from '../utils/sceneTags';
import { t, tLabel } from '../i18n';

interface Props {
  asset: Asset | null;
  collections: Collection[];
  packs: TagPack[];
  onClose: () => void;
  onUpdateTags: (id: string, tags: string[]) => Promise<void>;
}
export function OrganizeAssetModal({ asset, collections, packs, onClose, onUpdateTags }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const composing = useRef(false);
  useEffect(() => { setInput(''); setError(''); }, [asset?.id]);
  useEffect(() => {
    if (!asset) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [asset?.id, onClose]);
  if (!asset) return null;
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); } catch { setError(t('保存失败，请重试。')); } finally { setBusy(false); }
  };
  const toggleTag = (label: string) => {
    const tag = formatSceneTag(label);
    const current = asset.scenes || [];
    void perform(() => onUpdateTags(asset.id, current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]));
  };
  return <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="organize-title" className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center gap-2"><h2 id="organize-title" className="text-sm font-semibold truncate">{t('整理收藏')} · {asset.title}</h2><button aria-label={t('关闭整理收藏')} onClick={onClose} className="shrink-0 p-1"><X className="w-4 h-4" /></button></div>
      <div className="p-4 space-y-4 text-xs overflow-y-auto min-h-0">
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <label className="block space-y-2"><span className="font-medium">{t('处理状态')}</span><select aria-label={t('收藏处理状态')} disabled={busy} value={asset.useStatus || 'unmarked'} onChange={e => void perform(() => db.assets.update(asset.id, { useStatus: e.target.value as UseStatus, updatedAt: Date.now() }))} className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{Object.entries(USE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
        <section><h3 className="font-medium mb-2">{t('加入收藏集')}</h3><div className="grid grid-cols-2 gap-2">{collections.map(c => <label key={c.id} className="flex gap-2 items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"><input disabled={busy} type="checkbox" checked={belongsToCollection(asset, c, packs)} onChange={e => void perform(() => db.setCollectionMembership(asset.id, c.id, e.target.checked))} /><span className="truncate">{tLabel(c.name)}</span></label>)}</div>{collections.length === 0 && <p className="text-gray-500">{t('可从侧栏的管理按钮新建收藏集。')}</p>}</section>
        <section><h3 className="font-medium mb-2">{t('已有标签 · 点击移除')}</h3><div className="flex flex-wrap gap-1.5">{asset.scenes.map(tag => <button disabled={busy} key={tag} onClick={() => toggleTag(tag)} className="px-2 py-1 bg-brand-50 dark:bg-brand-900 text-brand-800 dark:text-brand-200 rounded-lg">{tLabel(tag)} ×</button>)}</div></section>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (composing.current || !input.trim()) return; const tag = formatSceneTag(input); void perform(() => onUpdateTags(asset.id, [...new Set([...asset.scenes, tag])])).then(() => setInput('')); }}>
          <input aria-label={t('自定义标签')} placeholder={t('自定义标签 · 中文最多 8 字')} value={input} onChange={e => setInput(composing.current ? e.target.value : shortenSceneTagText(e.target.value))} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={e => { composing.current = false; setInput(shortenSceneTagText(e.currentTarget.value)); }} className="min-w-0 flex-1 p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
          <button disabled={busy || !input.trim()} className="shrink-0 px-3 rounded-lg bg-brand-600 text-white disabled:opacity-40">{t('添加')}</button>
        </form>
        {packs.filter(p => p.enabled).map(pack => <section key={pack.id}><h3 className="font-medium mb-2">{tLabel(pack.name)}</h3><div className="flex flex-wrap gap-1.5">{pack.tags.map(tag => <button disabled={busy} aria-pressed={asset.scenes.includes(formatSceneTag(tag.label))} key={tag.id} title={tag.description} onClick={() => toggleTag(tag.label)} className={`px-2 py-1 rounded-lg ${asset.scenes.includes(formatSceneTag(tag.label)) ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{tLabel(tag.label)}</button>)}</div></section>)}
        <p className="text-gray-500">{t('修改立即保存。手动调整标签后，模型和本地规则会保留你的选择。')}</p>
      </div>
    </div>
  </div>;
}
