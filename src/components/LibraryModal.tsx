import React, { useEffect, useState } from 'react';
import { X, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Collection, TagPack, TagDefinition } from '../types/domain';
import { db } from '../services/db';
import { maxTagLength } from '../utils/sceneTags';
import { collectionFromTemplate } from '../data/tagPacks';
import { suggestTagLabels } from '../services/classification';
import { t, tLabel } from '../i18n';

interface Props {
  isOpen: boolean;
  collections: Collection[];
  packs: TagPack[];
  jevReady: boolean;
  classifying: boolean;
  onClassify: (collectionId?: string) => void;
  onClose: () => void;
}
const field = 'w-full min-w-0 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:border-brand-500';
const secondary = 'px-2.5 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40';
const primary = 'px-3 py-1.5 rounded-lg text-xs bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40';
const words = (text: string) => [...new Set(text.split(/[,，\n|]/).map(s => s.trim()).filter(Boolean))];
const validName = (name: string) => name.trim() && Array.from(name.trim()).length <= maxTagLength(name.trim());

export function LibraryModal({ isOpen, collections, packs, jevReady, classifying, onClassify, onClose }: Props) {
  const [tab, setTab] = useState<'collections' | 'packs'>('collections');
  const [editing, setEditing] = useState<Collection | null>(null);
  const [keywords, setKeywords] = useState('');
  const [tagsTouched, setTagsTouched] = useState(false); // 用户手动调整过收录标签后，不再按名称自动推荐
  const [editingPack, setEditingPack] = useState<TagPack | null>(null);
  const [tag, setTag] = useState<TagDefinition | null>(null);
  const [tagWords, setTagWords] = useState('');
  const [tagSites, setTagSites] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'collection' | 'pack'; id: string; name: string } | null>(null);
  useEffect(() => {
    if (isOpen) { setEditing(null); setEditingPack(null); setTag(null); setError(''); setPendingDelete(null); }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [isOpen, saving, onClose]);
  if (!isOpen) return null;

  const perform = async (action: () => Promise<unknown>) => {
    setSaving(true); setError('');
    try { await action(); } catch { setError(t('保存失败，请重试。')); } finally { setSaving(false); }
  };
  const startEdit = (collection?: Collection) => {
    setEditing(collection ? { ...collection } : { id: crypto.randomUUID(), name: '', description: '', keywords: [], tagLabels: [], packIds: [], order: Math.max(-1, ...collections.map(c => c.order)) + 1, updatedAt: Date.now() });
    setKeywords(collection?.keywords.join('，') || ''); setError('');
    setTagsTouched(!!collection?.tagLabels?.length);
  };
  const useTemplate = (pack: TagPack) => {
    if (!editing) return;
    const { keywords: templateKeywords, ...template } = collectionFromTemplate(pack);
    setEditing({ ...editing, ...template, assetType: undefined });
    setKeywords(templateKeywords.join('，'));
    setTagsTouched(true);
  };
  // 名称或关键词变化时，若用户还没手动调整过收录标签，就按名称自动推荐。
  const updateDraft = (next: Collection, nextKeywords = keywords) => {
    setEditing(tagsTouched ? next : { ...next, tagLabels: suggestTagLabels(next.name, words(nextKeywords), packs) });
  };
  const setTagLabels = (tagLabels: string[]) => {
    if (!editing) return;
    setTagsTouched(true);
    setEditing({ ...editing, tagLabels });
  };
  const saveCollection = () => {
    if (!editing) return;
    if (!validName(editing.name)) { setError(t('名称请填写 1–8 个中文字，或 1–24 个英文字符。')); return; }
    if (collections.some(c => c.id !== editing.id && c.name === editing.name.trim())) { setError(t('已有同名收藏集，请换一个名称。')); return; }
    void perform(async () => {
      await db.transaction('rw', db.collections, db.tagPacks, async () => {
        await db.collections.put({ ...editing, name: editing.name.trim(), description: editing.description.trim(), keywords: words(keywords), tagLabels: [...new Set(editing.tagLabels || [])], updatedAt: Date.now() });
        for (const id of editing.packIds) await db.tagPacks.update(id, { enabled: true });
      });
      setEditing(null);
    });
  };
  const move = (index: number, direction: number) => void perform(async () => {
    const ordered = [...collections];
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    await db.collections.bulkPut(ordered.map((c, order) => ({ ...c, order })));
  });
  const saveTag = () => {
    if (!tag || !editingPack) return;
    if (!validName(tag.label)) { setError(t('名称请填写 1–8 个中文字，或 1–24 个英文字符。')); return; }
    if (!tag.description.trim()) { setError(t('请填写这个标签的收录规则。')); return; }
    if (editingPack.tags.some(other => other.id !== tag.id && other.label === tag.label.trim())) { setError(t('这个标签已存在。')); return; }
    const next = { ...tag, label: tag.label.trim(), description: tag.description.trim(), keywords: words(tagWords), domains: words(tagSites).map(site => { try { return new URL(site.includes('://') ? site : `https://${site}`).hostname.toLowerCase(); } catch { return ''; } }).filter(Boolean) };
    setEditingPack({ ...editingPack, tags: [...editingPack.tags.filter(t => t.id !== next.id), next] });
    setTag(null); setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3" onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="library-title" className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 id="library-title" className="text-sm font-semibold">{t('收藏集与标签包')}</h2>
          <button onClick={onClose} aria-label={t('关闭收藏管理')} className="p-1 text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          {(['collections', 'packs'] as const).map(value => <button key={value} disabled={!!pendingDelete} onClick={() => { setTab(value); setEditing(null); setEditingPack(null); setTag(null); setError(''); }} className={tab === value ? primary : secondary}>{value === 'collections' ? t('收藏集') : t('场景标签包')}</button>)}
        </div>
        {pendingDelete && <div className="p-4 space-y-3 text-xs">
          <p className="font-medium">{pendingDelete.kind === 'collection' ? t('删除收藏集「{name}」？', { name: tLabel(pendingDelete.name) }) : t('删除标签包「{name}」？', { name: tLabel(pendingDelete.name) })}</p>
          <p className="text-gray-500">{pendingDelete.kind === 'collection' ? t('收藏链接和备忘会保留。') : t('手动添加的标签会保留。')}</p>
          {error && <p role="alert" className="text-red-600">{error}</p>}
          <div className="flex justify-end gap-2"><button className={secondary} disabled={saving} onClick={() => setPendingDelete(null)}>{t('取消删除')}</button><button className={primary} disabled={saving} onClick={() => void perform(async () => {
            if (pendingDelete.kind === 'collection') await db.deleteCollection(pendingDelete.id);
            else { await db.tagPacks.delete(pendingDelete.id); setEditingPack(null); }
            setPendingDelete(null);
          })}>{t('确认删除')}</button></div>
        </div>}
        {!pendingDelete && <div className="p-4 space-y-3 overflow-y-auto min-h-0 text-xs">
          {error && <p role="alert" className="text-red-600">{error}</p>}
          {tab === 'collections' && !editing && <>
            <p className="text-gray-500 leading-relaxed">{t('一个链接可加入多个收藏集。删除收藏集会保留链接；手动归类优先于自动分类。')}</p>
            <button onClick={() => startEdit()} className={`${primary} flex items-center gap-1`}><Plus className="w-3.5 h-3.5" />{t('新建收藏集')}</button>
            {collections.map((collection, index) => <div key={collection.id} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium min-w-0 truncate">{tLabel(collection.name)}</span>
                <div className="flex shrink-0 gap-1">
                  <button disabled={index === 0 || saving} onClick={() => move(index, -1)} aria-label={t('上移{name}', { name: tLabel(collection.name) })} className="p-1 disabled:opacity-25"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button disabled={index === collections.length - 1 || saving} onClick={() => move(index, 1)} aria-label={t('下移{name}', { name: tLabel(collection.name) })} className="p-1 disabled:opacity-25"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => startEdit(collection)} aria-label={t('编辑{name}', { name: tLabel(collection.name) })} className="p-1"><Pencil className="w-3.5 h-3.5" /></button>
                  <button disabled={saving} onClick={() => { setError(''); setPendingDelete({ kind: 'collection', id: collection.id, name: collection.name }); }} aria-label={t('删除{name}', { name: tLabel(collection.name) })} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {!!collection.tagLabels?.length && <p className="text-gray-500 line-clamp-2">{t('按标签收录：')}{collection.tagLabels.map(tLabel).join(t('、'))}</p>}
              {collection.description && <p className="text-gray-500 line-clamp-2">{collection.description}</p>}
              {!collection.assetType && collection.description && <button disabled={!jevReady || classifying} onClick={() => onClassify(collection.id)} className={secondary}>{t('Jev 归类已有收藏')}</button>}
            </div>)}
            {collections.length === 0 && <p className="text-gray-500">{t('还没有收藏集，可从场景模板新建。')}</p>}
          </>}
          {editing && tab === 'collections' && <div className="space-y-3">
            <label className="block space-y-1"><span>{t('从场景模板开始')}</span><select aria-label={t('从场景模板开始')} className={field} defaultValue="" onChange={e => { const pack = packs.find(p => p.id === e.target.value); if (pack) useTemplate(pack); }}><option value="">{t('自定义')}</option>{packs.filter(p => p.id !== 'general').map(p => <option key={p.id} value={p.id}>{tLabel(p.name)}</option>)}</select></label>
            <label className="block space-y-1"><span>{t('收藏集名称 · 中文最多 8 字')}</span><input autoFocus aria-label={t('收藏集名称')} className={field} value={editing.name} onChange={e => updateDraft({ ...editing, name: e.target.value })} /></label>
            <div className="space-y-1.5">
              <span>{t('自动收录带这些标签的收藏')}{!tagsTouched && (editing.tagLabels?.length || 0) > 0 ? t(' · 已按名称推荐') : ''}</span>
              <div className="flex flex-wrap gap-1.5">
                {(editing.tagLabels || []).map(label => <button key={label} aria-label={t('不再按{name}收录', { name: tLabel(label) })} onClick={() => setTagLabels((editing.tagLabels || []).filter(l => l !== label))} className="px-2 py-1 rounded-lg bg-brand-600 text-white flex items-center gap-1">{tLabel(label)}<X className="w-3 h-3" /></button>)}
                {!(editing.tagLabels || []).length && <span className="text-gray-500">{t('输入名称后自动推荐，也可从下方添加')}</span>}
              </div>
              <select aria-label={t('添加标签…')} className={field} value="" onChange={e => { if (e.target.value) setTagLabels([...(editing.tagLabels || []), e.target.value]); }}>
                <option value="">{t('添加标签…')}</option>
                {packs.filter(p => p.enabled).map(p => <optgroup key={p.id} label={tLabel(p.name)}>{p.tags.filter(tg => !(editing.tagLabels || []).includes(tg.label)).map(tg => <option key={tg.id} value={tg.label}>{tLabel(tg.label)}</option>)}</optgroup>)}
              </select>
            </div>
            <label className="block space-y-1"><span>{t('本地匹配关键词 · 逗号分隔（可选）')}</span><input aria-label={t('本地匹配关键词 · 逗号分隔（可选）')} className={field} value={keywords} onChange={e => { setKeywords(e.target.value); updateDraft(editing, e.target.value); }} /></label>
            <p className="text-gray-500">{t('带所选标签的收藏会自动收录，标签变准后收藏集也随之变准；关键词另外匹配标题、网址路径和原收藏夹名。都不填则只手动收录。')}</p>
            <label className="block space-y-1"><span>{t('收录规则 · 供模型判断（可选）')}</span><textarea aria-label={t('收录规则 · 供模型判断（可选）')} rows={3} className={field} placeholder={t('例如：面向海外用户的获客、收款或本地化工具与资料')} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></label>
            <label className="block space-y-1"><span>{t('按资源类型收录')}</span><select aria-label={t('按资源类型收录')} className={field} value={editing.assetType || ''} onChange={e => setEditing({ ...editing, assetType: (e.target.value || undefined) as Collection['assetType'] })}><option value="">{t('使用标签、收录规则与关键词')}</option><option value="tool">{tLabel('工具')}</option><option value="repo">{tLabel('代码仓库')}</option><option value="inspiration">{tLabel('灵感')}</option><option value="article">{tLabel('资料')}</option><option value="private">{tLabel('私密')}</option><option value="other">{tLabel('未分类')}</option></select></label>
            <details><summary className="cursor-pointer text-gray-600">{t('同时启用场景标签包')}</summary><div className="mt-2 grid grid-cols-2 gap-2">{packs.map(p => <label key={p.id} className="flex gap-1.5 items-center"><input type="checkbox" checked={editing.packIds.includes(p.id)} onChange={e => setEditing({ ...editing, packIds: e.target.checked ? [...editing.packIds, p.id] : editing.packIds.filter(id => id !== p.id) })} />{tLabel(p.name)}</label>)}</div></details>
            <div className="flex justify-end gap-2"><button className={secondary} onClick={() => setEditing(null)}>{t('取消')}</button><button disabled={saving} className={primary} onClick={saveCollection}>{t('保存收藏集')}</button></div>
          </div>}
          {tab === 'packs' && !editingPack && <>
            <p className="text-gray-500 leading-relaxed">{t('默认启用工作与学习相关的标签包，生活类（购物、旅行、健康家庭、兴趣娱乐、个人理财）需要时自行开启。启用的包立即进行本地匹配，也可手动选择标签；模型只判断已启用的标签包，用不到的包可以关闭。')}</p>
            <button className={primary} onClick={() => { setEditingPack({ id: crypto.randomUUID(), name: '', enabled: true, tags: [], order: Math.max(-1, ...packs.map(p => p.order)) + 1, updatedAt: Date.now() }); setTag(null); }}>{t('新建标签包')}</button>
            {packs.map(pack => <div key={pack.id} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={pack.enabled} onChange={e => void perform(() => db.tagPacks.update(pack.id, { enabled: e.target.checked }))} />{tLabel(pack.name)}</label><button aria-label={t('编辑标签包{name}', { name: tLabel(pack.name) })} onClick={() => { setEditingPack({ ...pack, tags: pack.tags.map(tg => ({ ...tg })) }); setTag(null); }} className="p-1"><Pencil className="w-3.5 h-3.5" /></button></div>
              <p className="text-gray-500 leading-relaxed">{pack.tags.map(tg => tLabel(tg.label)).join(' · ') || t('还没有标签')}</p>
            </div>)}
            <button className={secondary} disabled={!jevReady || classifying} onClick={() => onClassify()}>{t('Jev 归类已有公开收藏')}</button>
            {!jevReady && <p className="text-gray-500">{t('使用 Jev 时，请在设置中选择 Jev 并填写 Key；基础标签无需 Key。')}</p>}
          </>}
          {tab === 'packs' && editingPack && <div className="space-y-3">
            <label className="block space-y-1"><span>{t('标签包名称 · 中文最多 8 字')}</span><input aria-label={t('标签包名称')} className={field} value={editingPack.name} onChange={e => setEditingPack({ ...editingPack, name: e.target.value })} /></label>
            {editingPack.tags.map(tg => <div key={tg.id} className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2"><span>{tLabel(tg.label)}</span><div className="flex gap-2"><button aria-label={t('修改标签{name}', { name: tLabel(tg.label) })} onClick={() => { setTag({ ...tg }); setTagWords(tg.keywords.join('，')); setTagSites((tg.domains || []).join('，')); }}><Pencil className="w-3.5 h-3.5" /></button><button aria-label={t('移除标签{name}', { name: tLabel(tg.label) })} onClick={() => setEditingPack({ ...editingPack, tags: editingPack.tags.filter(item => item.id !== tg.id) })}><X className="w-3.5 h-3.5" /></button></div></div>)}
            <button className={secondary} onClick={() => { setTag({ id: crypto.randomUUID(), label: '', description: '', keywords: [] }); setTagWords(''); setTagSites(''); }}>{t('添加标签')}</button>
            {tag && <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
              <input aria-label={t('标签名称')} className={field} placeholder={t('标签名称 · 中文最多 8 字')} value={tag.label} onChange={e => setTag({ ...tag, label: e.target.value })} />
              <textarea aria-label={t('哪些内容适合这个标签')} className={field} rows={2} placeholder={t('哪些内容适合这个标签')} value={tag.description} onChange={e => setTag({ ...tag, description: e.target.value })} />
              <input aria-label={t('本地关键词，逗号分隔')} className={field} placeholder={t('本地关键词，逗号分隔')} value={tagWords} onChange={e => setTagWords(e.target.value)} />
              <input aria-label={t('指定网站（可选，逗号分隔）')} className={field} placeholder={t('指定网站（可选，逗号分隔）')} value={tagSites} onChange={e => setTagSites(e.target.value)} />
              <div className="flex gap-2 justify-end"><button className={secondary} onClick={() => setTag(null)}>{t('取消编辑')}</button><button className={primary} onClick={saveTag}>{t('应用标签修改')}</button></div>
            </div>}
            <div className="flex justify-between gap-2 pt-2"><button className={`${secondary} text-red-600`} disabled={saving} onClick={() => { setError(''); setPendingDelete({ kind: 'pack', id: editingPack.id, name: editingPack.name }); }}>{t('删除标签包')}</button><div className="flex gap-2"><button className={secondary} onClick={() => setEditingPack(null)}>{t('取消')}</button><button className={primary} disabled={saving || !!tag} onClick={() => {
              if (!validName(editingPack.name)) { setError(t('名称请填写 1–8 个中文字，或 1–24 个英文字符。')); return; }
              if (packs.some(p => p.id !== editingPack.id && p.name === editingPack.name.trim())) { setError(t('已有同名标签包，请换一个名称。')); return; }
              void perform(async () => { await db.tagPacks.put({ ...editingPack, name: editingPack.name.trim(), updatedAt: Date.now() }); setEditingPack(null); });
            }}>{t('保存标签包')}</button></div></div>
          </div>}
        </div>}
      </div>
    </div>
  );
}
