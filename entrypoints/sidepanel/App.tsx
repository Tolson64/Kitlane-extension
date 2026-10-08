import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../src/services/db';
import { SearchEngine } from '../../src/services/searchService';
import { Header } from '../../src/components/Header';
import { SearchBar } from '../../src/components/SearchBar';
import { FilterPills } from '../../src/components/FilterPills';
import { BookmarkCard } from '../../src/components/BookmarkCard';
import { SettingsModal } from '../../src/components/SettingsModal';
import { RunbookModal } from '../../src/components/RunbookModal';
import { LibraryModal } from '../../src/components/LibraryModal';
import { OrganizeAssetModal } from '../../src/components/OrganizeAssetModal';
import { Asset, AssetType, AppSettings, DEFAULT_SETTINGS, USE_STATUS_LABELS } from '../../src/types/domain';
import { detectAssetType, isLocalOnly } from '../../src/services/adapters/router';
import { enrichPrivateAsset } from '../../src/services/adapters/privateSafeAdapter';
import { parseGitHubUrl, fetchGitHubInfo, githubApiOriginsFor } from '../../src/services/adapters/githubAdapter';
import { analyzeWithModel } from '../../src/services/aiService';
import { belongsToCollection, classifyLibrary, effectiveTags, evidenceText, hasUncertainCollection, needsModelAnalysis } from '../../src/services/classification';
import { classifyWithJev, uncachedDecisionLibrary, type JevResult } from '../../src/services/jevService';
import { SMART_SEARCH_CANDIDATES, rankLocally } from '../../src/services/recallService';
import { SmartSearchEngine, canSearchWithModel, combineSearchResults, smartSearchFingerprint, type SmartSearchProgress } from '../../src/services/smartSearchService';
import { smartSearchIsReady, modelKindLabel, modelAnalysisIsReady, usesLocalModelEndpoint, modelFingerprint } from '../../src/services/modelConfig';
import { collectPageEvidence, needsPageEvidence, permittedForEvidence, requestPageEvidenceAccess } from '../../src/services/pageEvidenceService';
import { getLanguage, setLanguage, t, tLabel } from '../../src/i18n';

type SemanticSearchView = SmartSearchProgress & { context: string; phase: 'collecting' | 'running' | 'done' | 'stopped' | 'error'; message?: string; candidates: number; expanded: boolean };

function modelIsReady(settings: AppSettings): boolean {
  return modelAnalysisIsReady(settings);
}

export const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [organizingId, setOrganizingId] = useState<string | null>(null);
  const [onlyUncertain, setOnlyUncertain] = useState(false);
  const [activeUseStatus, setActiveUseStatus] = useState('all');
  const [classificationProgress, setClassificationProgress] = useState({ active: false, done: 0, total: 0, failed: 0 });
  const [runbookAsset, setRunbookAsset] = useState<Asset | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // 界面语言随设置切换：每次渲染前设置，整个侧栏随之更新。
  setLanguage(settings.language);
  useEffect(() => { document.documentElement.lang = getLanguage() === 'en' ? 'en' : 'zh-CN'; }, [settings.language]);
  const settingsRef = useRef(settings);
  const queueRunning = useRef(false);
  const manualUpdate = useRef(false);
  const queuePaused = useRef(false);
  const [modelUpdate, setModelUpdate] = useState<{ active: boolean; total: number; message?: string }>({ active: false, total: 0 });
  const evidenceAbort = useRef<AbortController | null>(null);
  const evidenceSeenCount = useRef(0);
  const [evidenceRun, setEvidenceRun] = useState({ active: false, done: 0, total: 0 });
  const [evidenceDeclined, setEvidenceDeclined] = useState(false);
  const classificationRunning = useRef(false);
  const cancelClassification = useRef(false);
  const classificationAbort = useRef<AbortController | null>(null);
  const semanticEngine = useMemo(() => new SmartSearchEngine(), []);
  const semanticAbort = useRef<AbortController | null>(null);
  const [semanticView, setSemanticView] = useState<SemanticSearchView | null>(null);

  // 1. 从 IndexedDB 实时查询全部资产
  const storedAssets = useLiveQuery(() => db.assets.orderBy('updatedAt').reverse().toArray(), []) || [];
  const collections = useLiveQuery(() => db.collections.orderBy('order').toArray(), []) || [];
  const packs = useLiveQuery(() => db.getTagPacks(), []) || [];
  const assets = useMemo(() => classifyLibrary(storedAssets, packs), [storedAssets, packs]);
  const activeCollection = collections.find(c => c.id === activeType);
  // 旧版本地决策接口不判断收藏集，不能以收藏集未判断为由反复排队。
  const collectionsForModel = (s: AppSettings) => s.modelProvider === 'laya_local' ? [] : collections;
  useEffect(() => {
    if (activeType !== 'all' && !collections.some(c => c.id === activeType)) setActiveType('all');
  }, [collections, activeType]);

  // 加载用户设置
  useEffect(() => {
    db.getSettings().then(setSettings);
  }, []);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => () => { cancelClassification.current = true; classificationAbort.current?.abort(); }, []);

  const searchEngine = useMemo(() => {
    const engine = new SearchEngine();
    engine.indexAll(assets);
    return engine;
  }, [assets]);

  // Collection/status filters define the scope for both local and model searches.
  const scopeAssets = useMemo(() => {
    let result = assets;

    // 分类筛选
    if (activeType !== 'all') {
      result = activeCollection ? result.filter(a => onlyUncertain ? hasUncertainCollection(a, activeCollection) : belongsToCollection(a, activeCollection, packs)) : [];
    }
    if (activeUseStatus !== 'all') result = result.filter(a => (a.useStatus || 'unmarked') === activeUseStatus);
    return result;
  }, [assets, activeType, activeCollection, onlyUncertain, activeUseStatus, packs]);

  // 本地排序（全文检索 + 标签意图 + 子串，RRF 融合），无模型也能理解「把图片弄小」这类描述。
  const keywordAssets = useMemo(() => query.trim() ? rankLocally(query, scopeAssets, packs, searchEngine) : scopeAssets, [scopeAssets, query, packs, searchEngine]);

  const searchContext = JSON.stringify([query.trim().normalize('NFC').toLowerCase(), activeType, onlyUncertain, activeUseStatus, settings.modelProvider, settings.baseUrl, settings.modelName, settings.allowRemoteEnrichment, settings.chatJsonMode]);
  const currentSemantic = semanticView?.context === searchContext ? semanticView : null;
  const filteredAssets = useMemo(() => currentSemantic && query.trim()
    ? combineSearchResults(scopeAssets, keywordAssets.map(asset => asset.id), currentSemantic.matches)
    : keywordAssets, [scopeAssets, keywordAssets, currentSemantic, query]);
  const smartReady = smartSearchIsReady(settings);
  const searchModelLabel = modelKindLabel(settings);
  const publicSearchCount = scopeAssets.filter(canSearchWithModel).length;

  useEffect(() => {
    setSemanticView(null);
    return () => { semanticAbort.current?.abort(); semanticAbort.current = null; };
  }, [searchContext, settings.apiKey]);

  // 智能搜索：本地排序前 SMART_SEARCH_CANDIDATES 条公开收藏交给模型重排；expand 时交给模型的是当前范围内全部公开收藏。
  const handleSemanticSearch = async (expand = false) => {
    if (semanticAbort.current || !query.trim() || !smartReady || publicSearchCount === 0) return;
    const context = searchContext;
    const localPublic = keywordAssets.filter(canSearchWithModel);
    const localIds = new Set(localPublic.map(asset => asset.id));
    // 本地候选不足时，用最近收藏的内容补满：本地匹配不到的中英文差异、刚收藏的资料，也能交给模型判断。
    const others = scopeAssets.filter(asset => canSearchWithModel(asset) && !localIds.has(asset.id)).sort((a, b) => b.createdAt - a.createdAt);
    const picked = expand ? [...localPublic, ...others] : [...localPublic, ...others].slice(0, SMART_SEARCH_CANDIDATES);
    const base = { candidates: picked.length, expanded: expand };
    const controller = new AbortController();
    semanticAbort.current = controller;
    const currentSettings = { ...settings };
    // 只为候选所在的网站申请读取权限；须在任何 await 之前调用，以保留这次点击的授权上下文。
    const permission = requestPageEvidenceAccess(picked);
    const order = new Map(picked.map((asset, index) => [asset.id, index]));
    setSemanticView({ context, phase: 'collecting', done: 0, total: 0, cached: 0, matches: [], ...base });
    try {
      await permission;
      controller.signal.throwIfAborted();
      await collectPageEvidence(picked, controller.signal, progress => {
        if (semanticAbort.current === controller && !controller.signal.aborted) setSemanticView({ context, phase: 'collecting', ...progress, cached: 0, matches: [], ...base });
      });
      controller.signal.throwIfAborted();
      const livePacks = await db.getTagPacks();
      const liveCollection = activeCollection ? await db.collections.get(activeCollection.id) : undefined;
      // 使用刚读取的网页资料，并确认候选仍在当前收藏集与状态范围内；保持本地排序。
      const candidates = classifyLibrary(await db.assets.toArray(), livePacks).filter(asset => order.has(asset.id))
        .filter(asset => activeType === 'all' || (liveCollection && (onlyUncertain ? hasUncertainCollection(asset, liveCollection) : belongsToCollection(asset, liveCollection, livePacks))))
        .filter(asset => activeUseStatus === 'all' || (asset.useStatus || 'unmarked') === activeUseStatus)
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      controller.signal.throwIfAborted();
      setSemanticView({ context, phase: 'running', done: 0, total: candidates.filter(canSearchWithModel).length, cached: 0, matches: [], ...base });
      await semanticEngine.search(query, candidates, currentSettings, controller.signal, progress => {
        if (semanticAbort.current === controller && !controller.signal.aborted) setSemanticView({ context, phase: 'running', ...progress, ...base });
      }, async () => {
        if (!smartSearchIsReady(settingsRef.current) || settingsRef.current.modelProvider !== currentSettings.modelProvider || settingsRef.current.baseUrl !== currentSettings.baseUrl || settingsRef.current.modelName !== currentSettings.modelName || settingsRef.current.apiKey !== currentSettings.apiKey || settingsRef.current.chatJsonMode !== currentSettings.chatJsonMode) controller.abort();
        // Re-read before each batch so deleted or newly private bookmarks cannot enter later requests.
        const livePacks = await db.getTagPacks();
        return classifyLibrary(await db.assets.toArray(), livePacks);
      });
      if (semanticAbort.current === controller) setSemanticView(view => view?.context === context ? { ...view, phase: controller.signal.aborted ? 'stopped' : 'done' } : view);
    } catch (error) {
      if (semanticAbort.current === controller) setSemanticView(view => view?.context === context ? { ...view, phase: controller.signal.aborted ? 'stopped' : 'error', message: controller.signal.aborted ? undefined : error instanceof Error && error.name === 'TimeoutError' ? t('模型请求超时，已保留关键词结果；本地服务请确认模型已加载后重试。') : error instanceof Error ? error.message : t('模型暂时无法连接，已保留关键词结果。') } : view);
    } finally {
      if (semanticAbort.current === controller) semanticAbort.current = null;
    }
  };

  const searchScopeById = new Map(scopeAssets.map(asset => [asset.id, asset]));
  const semanticLabels = new Map(currentSemantic?.matches.filter(match => {
    const asset = searchScopeById.get(match.id);
    return asset && match.fingerprint === smartSearchFingerprint(asset) && ['match', 'related'].includes(match.decision);
  }).map(match => [match.id, match.decision === 'match' ? `${searchModelLabel} · ${t('意图匹配')}` : `${searchModelLabel} · ${t('相关内容')}`]) || []);

  const billing = usesLocalModelEndpoint(settings) ? '' : t(' · 可能计费');
  const rerankCount = Math.min(SMART_SEARCH_CANDIDATES, publicSearchCount);
  const searchStatus = (() => {
    const s = currentSemantic;
    if (!s) {
      if (!smartReady) return t('本地搜索 · 点「智能搜索」配置模型后可由模型重排结果');
      if (!publicSearchCount) return t('本地搜索 · 当前范围没有可交给模型的公开收藏');
      return t('本地搜索 · 回车或点「智能搜索」由{model}重排前 {n} 条', { model: searchModelLabel, n: rerankCount }) + billing;
    }
    const scope = s.expanded ? t('全部 {n} 条', { n: s.candidates }) : t('前 {n} 条', { n: s.candidates });
    const found = semanticLabels.size;
    if (s.phase === 'collecting') return t('智能搜索 · 读取网页资料 {done}/{total}', { done: s.done, total: s.total });
    if (s.phase === 'running') return t('智能搜索 · {model}重排{scope} {done}/{total}', { model: searchModelLabel, scope, done: s.done, total: s.total });
    if (s.phase === 'stopped') return t('智能搜索已停止 · 已判断 {done}/{total}，相关 {found} 条', { done: s.done, total: s.total, found }) + (billing ? t('，已发出的请求可能仍会计费') : '');
    if (s.phase === 'error') return t('智能搜索已暂停 · 相关 {found} 条', { found });
    return found ? t('智能搜索 · {model}在{scope}中找到相关 {found} 条', { model: searchModelLabel, scope, found }) + (s.cached ? t('（复用 {n} 条）', { n: s.cached }) : '') : t('智能搜索 · {model}在{scope}中没有找到相关内容，显示本地结果', { model: searchModelLabel, scope });
  })();

  const applyJudgments = async (original: Asset, result: JevResult) => {
    await db.transaction('rw', db.assets, db.collections, db.tagPacks, async () => {
      const latest = await db.assets.get(original.id);
      if (!latest || isLocalOnly(latest) || evidenceText(latest) !== evidenceText(original)) return;
      const liveCollections = await db.collections.toArray();
      const livePacks = await db.getTagPacks();
      const collectionJudgments = { ...latest.collectionJudgments };
      const tagJudgments = { ...latest.tagJudgments };
      for (const [id, judgment] of Object.entries(result.collectionJudgments)) {
        if (liveCollections.some(c => c.id === id && c.updatedAt === judgment.ruleVersion)) collectionJudgments[id] = judgment;
      }
      for (const [id, judgment] of Object.entries(result.tagJudgments)) {
        if (livePacks.some(p => p.updatedAt === judgment.ruleVersion && p.tags.some(t => `${p.id}:${t.id}` === id))) tagJudgments[id] = judgment;
      }
      await db.assets.update(latest.id, { collectionJudgments, tagJudgments });
    });
  };

  const handleClassifyExisting = async (collectionId?: string) => {
    if (classificationRunning.current || queueRunning.current) { alert(t('当前分析完成后，请再开始归类。')); return; }
    if (settings.modelProvider !== 'jev' || !modelIsReady(settings)) { alert(t('请在设置中选择 Jev 并填写 Key。')); return; }
    classificationRunning.current = true; cancelClassification.current = false;
    const controller = new AbortController();
    classificationAbort.current = controller;
    const currentSettings = { ...settings };
    const permission = requestPageEvidenceAccess(assets);
    setClassificationProgress({ active: true, done: 0, total: assets.filter(canSearchWithModel).length, failed: 0 });
    try {
      await permission;
      await collectPageEvidence(assets, controller.signal, undefined, () => !cancelClassification.current && settingsRef.current.allowRemoteEnrichment && settingsRef.current.modelProvider === 'jev');
      if (controller.signal.aborted || cancelClassification.current) return;
      const records = (await db.assets.toArray()).filter(a => !isLocalOnly(a));
      const currentCollections = await db.collections.toArray();
      const currentPacks = await db.getTagPacks();
      const library = { collections: currentCollections.filter(c => !collectionId || c.id === collectionId), packs: currentPacks, includeTags: !collectionId, includeType: false };
      setClassificationProgress({ active: true, done: 0, total: records.length, failed: 0 });
      for (const record of records) {
        if (cancelClassification.current || !settingsRef.current.allowRemoteEnrichment || settingsRef.current.modelProvider !== 'jev') break;
        let failed = false;
        try {
          const latest = await db.assets.get(record.id);
          if (latest && !isLocalOnly(latest)) {
            const missing = uncachedDecisionLibrary(latest, library, currentSettings.modelName);
            if (missing.collections.length || (missing.includeTags && missing.packs.length)) {
              const result = await classifyWithJev(latest, currentSettings, missing);
              await applyJudgments(latest, result);
            }
          }
        } catch { failed = true; }
        setClassificationProgress(p => ({ ...p, done: p.done + 1, failed: p.failed + Number(failed) }));
        if (failed) break; // 避免 Key、限额或网络异常时继续批量调用
      }
    } catch { alert(t('归类任务未能开始，请重试。')); }
    finally { classificationRunning.current = false; classificationAbort.current = null; setClassificationProgress(p => ({ ...p, active: false })); }
  };

  // 用户主动请求时才分析单个公开资产。
  const enrichSingleAsset = async (item: Asset, currentSettings: AppSettings) => {
    if (isLocalOnly(item)) throw new Error(t('私密收藏不会发送给模型'));
    if (!modelIsReady(currentSettings)) throw new Error(t('请先配置模型并允许分析公开收藏'));
    const settingsStillCurrent = () => modelIsReady(settingsRef.current) && ['modelProvider', 'baseUrl', 'modelName', 'apiKey', 'allowRemoteEnrichment'].every(key => settingsRef.current[key as keyof AppSettings] === currentSettings[key as keyof AppSettings]);
    await collectPageEvidence([item], undefined, undefined, settingsStillCurrent);
    if (!settingsStillCurrent()) return;
    const current = await db.assets.get(item.id);
    if (!current) return;
    if (isLocalOnly(current)) throw new Error(t('私密收藏不会发送给模型'));
    item = { ...current };
    item.enrichmentStatus = 'processing';
    await db.assets.put(item);
    let snippet = item.sourceText || '';

    if (item.assetType === 'repo') {
      const parsed = parseGitHubUrl(item.url);
      if (parsed) {
        const meta = await fetchGitHubInfo(parsed.owner, parsed.repo);
        // GitHub 限流或超时时返回空内容，保留已有资料，不用空文本覆盖。
        if (meta.description || meta.readmeSnippet || meta.language) {
          item.stars = meta.stars;
          item.language = meta.language;
          snippet = `${meta.description}\nTopics: ${meta.topics.join(', ')}\n${meta.readmeSnippet}`;
        }
      }
    }

    const fetchedStars = item.stars;
    const fetchedLanguage = item.language;
    const originalEvidence = evidenceText(item);
    // 交给模型判断：带收录规则且没有手动选择的收藏集；启用的标签库（用户手动改过标签的不判断标签）；本地规则已打的标签。
    const modelCollections = (await db.collections.toArray()).filter(c => !c.assetType && c.description.trim() && item.collectionOverrides?.[c.id] === undefined);
    const modelPacks = await db.getTagPacks();
    const localTags = item.userEditedScenes ? [] : effectiveTags({ ...item, scenes: [], tagJudgments: undefined }, modelPacks).map(tag => tag.replace(/^#/, ''));
    const page = new URL(item.url);
    if (!settingsStillCurrent()) return;
    const enriched = await analyzeWithModel(item.title, `${page.origin}${page.pathname}`, snippet, currentSettings, { collections: modelCollections, packs: modelPacks, includeTags: !item.userEditedScenes }, localTags);
    let applied = false;
    await db.transaction('rw', db.assets, async () => {
      const latest = await db.assets.get(item.id);
      if (!latest) return;
      if (isLocalOnly(latest)) {
        await db.assets.update(latest.id, { enrichmentStatus: 'skipped', enrichmentStartedAt: undefined });
        return;
      }
      if (evidenceText(latest) !== originalEvidence) {
        await db.assets.update(latest.id, { enrichmentStatus: 'pending', enrichmentStartedAt: undefined });
        return;
      }
      item = latest;
      if (enriched.assetType && !item.userEditedType) item.assetType = enriched.assetType;
      if (currentSettings.modelProvider !== 'jev') {
        if (!item.userEditedScenes) item.scenes = enriched.scenes;
        item.features = enriched.features;
        item.summary = enriched.summary;
      }
      item.stars = fetchedStars ?? item.stars;
      item.language = fetchedLanguage ?? item.language;
      item.isPrivate = item.assetType === 'private' || isLocalOnly(item);
      item.enrichmentStatus = item.isPrivate ? 'skipped' : 'done';
      item.enrichmentStartedAt = undefined;
      item.lastEnrichedAt = Date.now();
      item.analyzedWith = modelFingerprint(currentSettings);
      item.updatedAt = Date.now();
      item.sourceText = snippet;
      await db.assets.put(item);
      applied = true;
    });
    if (applied && enriched.collectionJudgments && enriched.tagJudgments) await applyJudgments(item, enriched as JevResult);
  };

  // 队列在「自动分析」开启或用户点了「全部更新」时运行；停止后不再领取新任务。
  const runAutoEnrichment = async () => {
    if (queueRunning.current || classificationRunning.current) return;
    queueRunning.current = true;
    try {
      await db.recoverStaleAnalyses(Date.now() - 5 * 60_000);
      await db.skipPrivatePending();
      while (!queuePaused.current && (settingsRef.current.autoEnrichEnabled || manualUpdate.current) && modelIsReady(settingsRef.current)) {
        const currentSettings = settingsRef.current;
        const limit = Math.max(1, Math.min(5, currentSettings.concurrencyLimit || 3));
        const batch = await db.claimPendingAssets(limit);
        if (batch.length === 0) break;
        let failures = 0;
        await Promise.all(batch.map(async asset => {
          try {
            await enrichSingleAsset(asset, currentSettings);
          } catch (error) {
            failures++;
            console.warn('自动标签分析失败:', error);
            const latest = await db.assets.get(asset.id);
            if (latest?.enrichmentStatus === 'processing') {
              await db.assets.update(asset.id, { enrichmentStatus: 'failed', enrichmentStartedAt: undefined });
            }
          }
        }));
        // 整批失败多半是 Key、额度或网络问题，暂停以免继续逐条失败。
        if (failures === batch.length) {
          if (manualUpdate.current) setModelUpdate(u => ({ ...u, message: t('请求失败，已暂停。请检查模型设置或网络后点「全部更新」重试。') }));
          break;
        }
      }
    } catch (error) {
      console.error('自动标签队列暂停，稍后重试:', error);
    } finally {
      queueRunning.current = false;
      manualUpdate.current = false;
      setModelUpdate(u => u.active ? { ...u, active: false } : u);
    }
  };

  // 用当前模型更新所有尚未被它分析过的公开收藏。permission 须在点击事件里、任何 await 之前发起。
  const startModelUpdate = async (permission: Promise<boolean>) => {
    await permission;
    if (!modelIsReady(settingsRef.current)) return;
    if (classificationRunning.current) { alert(t('Jev 归类完成后，请再点「全部更新」。')); return; }
    await db.queueForModel(modelFingerprint(settingsRef.current), collectionsForModel(settingsRef.current));
    const total = (await db.assets.where('enrichmentStatus').anyOf('pending', 'processing').toArray()).filter(a => !isLocalOnly(a)).length;
    if (!total) return;
    queuePaused.current = false;
    manualUpdate.current = true;
    setModelUpdate({ active: true, total });
    void runAutoEnrichment();
  };

  const handleUpdateAll = () => {
    const targets = assets.filter(a => needsModelAnalysis(a, modelFingerprint(settingsRef.current), collectionsForModel(settingsRef.current)));
    void startModelUpdate(requestPageEvidenceAccess(targets, githubApiOriginsFor(targets)));
  };

  const stopModelUpdate = () => {
    queuePaused.current = true;
    manualUpdate.current = false;
    setModelUpdate(u => ({ ...u, active: false, message: usesLocalModelEndpoint(settingsRef.current) ? t('已停止，进行中的请求会完成。') : t('已停止，进行中的请求会完成，可能仍会计费。') }));
  };

  // 顶部刷新：导入浏览器收藏；已配置模型时，接着用该模型更新全部需要更新的收藏。
  const handleRefreshAll = async () => {
    const ready = modelIsReady(settingsRef.current);
    const evidenceTargets = evidenceDeclined ? [] : assets.filter(a => needsPageEvidence(a));
    const modelTargets = ready ? assets.filter(a => needsModelAnalysis(a, modelFingerprint(settingsRef.current), collectionsForModel(settingsRef.current))) : [];
    // 一次授权同时用于读取网页简介和模型更新；须在任何 await 之前调用。
    const permission = requestPageEvidenceAccess([...evidenceTargets, ...modelTargets], githubApiOriginsFor(modelTargets));
    await handleSyncBookmarks();
    void runPageEvidence(await db.assets.toArray(), permission);
    if (ready) await startModelUpdate(permission);
  };

  // 读取网页公开简介与页面类型（不调用模型）。没有 permission 时只处理已授权的网站，不弹窗。
  const runPageEvidence = async (targets: Asset[], permission?: Promise<boolean>) => {
    if (evidenceAbort.current) return;
    const controller = new AbortController();
    evidenceAbort.current = controller;
    try {
      if (permission && !(await permission)) setEvidenceDeclined(true);
      const allowed = await permittedForEvidence(targets);
      if (!allowed.length || controller.signal.aborted) return;
      setEvidenceRun({ active: true, done: 0, total: allowed.length });
      await collectPageEvidence(allowed, controller.signal, progress => setEvidenceRun({ active: true, ...progress }));
    } catch { /* 读取失败不影响分类和搜索 */ }
    finally {
      evidenceAbort.current = null;
      setEvidenceRun(run => ({ ...run, active: false }));
    }
  };
  const handleReadEvidence = () => {
    const targets = assets.filter(a => needsPageEvidence(a));
    void runPageEvidence(targets, requestPageEvidenceAccess(targets));
  };
  // 打开侧栏时、以及之后新增收藏时，自动读取已授权网站中还没读过简介的收藏（不弹窗）。
  useEffect(() => {
    if (storedAssets.length <= evidenceSeenCount.current) return;
    evidenceSeenCount.current = storedAssets.length;
    void runPageEvidence(storedAssets);
  }, [storedAssets]);

  useEffect(() => {
    if (settings.autoEnrichEnabled && modelIsReady(settings)) void runAutoEnrichment();
  }, [settings, assets]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (settingsRef.current.autoEnrichEnabled && modelIsReady(settingsRef.current)) void runAutoEnrichment();
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // 全量扫描并同步浏览器书签
  const handleSyncBookmarks = async () => {
    if (!chrome?.bookmarks?.getTree) {
      alert(t('未检测到浏览器书签权限，请确保在 Chrome / Edge 中运行。'));
      return;
    }

    setIsSyncing(true);
    try {
      const tree = await chrome.bookmarks.getTree();
      const extracted: { id: string; title: string; url: string; folderName?: string }[] = [];

      const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[], currentFolder = '') => {
        for (const node of nodes) {
          if (node.url) {
            extracted.push({
              id: node.id,
              title: node.title || node.url,
              url: node.url,
              folderName: currentFolder
            });
          }
          if (node.children) {
            traverse(node.children, node.title || currentFolder);
          }
        }
      };

      traverse(tree);

      const newAssets: Asset[] = [];
      for (const item of extracted) {
        const existing = await db.assets.where('bookmarkId').equals(item.id).first();
        if (!existing) {
          const type = detectAssetType(item.url);
          const asset: Asset = {
            id: crypto.randomUUID(),
            bookmarkId: item.id,
            folderName: item.folderName,
            url: item.url,
            title: item.title,
            assetType: type,
            scenes: [],
            features: [],
            summary: item.title,
            isPrivate: type === 'private' || isLocalOnly(item),
            enrichmentStatus: type === 'private' || isLocalOnly(item) ? 'skipped' : 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          if (type === 'private') {
            const enriched = enrichPrivateAsset(asset);
            Object.assign(asset, enriched);
          }

          newAssets.push(asset);
        } else if (existing.title !== item.title || existing.url !== item.url || existing.folderName !== item.folderName) {
          const urlChanged = existing.url !== item.url;
          existing.title = item.title;
          existing.url = item.url;
          existing.folderName = item.folderName;
          existing.isPrivate = isLocalOnly(existing);
          if (urlChanged) existing.enrichmentStatus = existing.isPrivate ? 'skipped' : 'pending';
          existing.collectionJudgments = undefined;
          existing.tagJudgments = undefined;
          if (urlChanged) { existing.sourceText = undefined; existing.pageEvidence = undefined; }
          existing.updatedAt = Date.now();
          await db.assets.put(existing);
        }
      }

      if (newAssets.length > 0) {
        await db.upsertAssets(newAssets);
      }

      // 本地搜索立即可用；启用自动标签后，队列会继续处理公开书签。
    } catch (err) {
      console.error('书签扫描同步失败:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 单卡片即时重分析（由 DeepSeek 重新深入解析）
  const handleReanalyzeSingle = async (asset: Asset) => {
    if (classificationRunning.current) return;
    if (asset.enrichmentStatus === 'processing') return;
    try {
      if (modelIsReady(settings)) await requestPageEvidenceAccess([asset], githubApiOriginsFor([asset]));
      await enrichSingleAsset(asset, settings);
    } catch (error) {
      const current = await db.assets.get(asset.id);
      if (current && current.enrichmentStatus === 'processing') await db.assets.update(asset.id, { enrichmentStatus: 'failed', enrichmentStartedAt: undefined });
      alert(error instanceof Error ? error.message : t('分析失败'));
    }
  };

  // 手动纠错/更改大类分类
  const handleChangeType = async (assetId: string, newType: AssetType) => {
    const target = await db.assets.get(assetId);
    if (target) {
      target.assetType = newType;
      target.userEditedType = true;
      if (newType === 'private') target.isPrivate = true;
      target.updatedAt = Date.now();
      await db.assets.put(target);
    }
  };

  // 手动编辑/添加/删除场景标签
  const handleUpdateTags = async (assetId: string, newScenes: string[]) => {
    const target = await db.assets.get(assetId);
    if (target) {
      target.scenes = newScenes;
      target.userEditedScenes = true;
      target.updatedAt = Date.now();
      await db.assets.put(target);
    }
  };

  const handleSaveRunbook = async (assetId: string, notes: string) => {
    const target = await db.assets.get(assetId);
    if (target) {
      target.runbookNotes = notes;
      target.updatedAt = Date.now();
      await db.assets.put(target);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    semanticAbort.current?.abort();
    classificationAbort.current?.abort();
    cancelClassification.current = true;
    // 换了模型配置，结束进行中的「全部更新」；新配置下可重新点击。
    manualUpdate.current = false;
    queuePaused.current = false;
    setModelUpdate({ active: false, total: 0 });
    settingsRef.current = newSettings;
    setSettings(newSettings);
    await db.saveSettings(newSettings);
  };

  const pendingCount = assets.filter(asset => asset.enrichmentStatus === 'pending' && !asset.isPrivate).length;
  const processingCount = assets.filter(asset => asset.enrichmentStatus === 'processing').length;
  const failedCount = assets.filter(asset => asset.enrichmentStatus === 'failed').length;
  const modelReady = modelIsReady(settings);
  const pendingEvidenceCount = evidenceDeclined ? 0 : assets.filter(a => needsPageEvidence(a)).length;
  const staleCount = modelReady ? assets.filter(a => needsModelAnalysis(a, modelFingerprint(settings), collectionsForModel(settings))).length : 0;

  const handleExport = async () => {
    const records = await db.assets.toArray();
    const classified = new Map(classifyLibrary(records, packs).map(a => [a.id, a]));
    const blob = new Blob([JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), collections, tagPacks: packs, assets: records.map(a => {
      const live = classified.get(a.id)!;
      return { ...a, effectiveTags: live.scenes, collectionIds: collections.filter(c => belongsToCollection(live, c, packs)).map(c => c.id) };
    }) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kitlane-assets-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenAsset = async (asset: Asset) => {
    await db.assets.update(asset.id, { openedAt: Date.now() });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 select-none overflow-hidden font-sans">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSyncBookmarks={() => void handleRefreshAll()}
        onExport={handleExport}
        isSyncing={isSyncing}
        totalCount={assets.length}
      />

      <SearchBar value={query} onChange={setQuery} onSemanticSearch={() => void handleSemanticSearch()} onStop={() => semanticAbort.current?.abort()} onConfigure={() => setIsSettingsOpen(true)} modelReady={smartReady} modelLabel={searchModelLabel} searching={currentSemantic?.phase === 'running' || currentSemantic?.phase === 'collecting'} publicCount={publicSearchCount} />

      {/* 搜索状态：一行说明当前是本地搜索还是智能搜索，以及可做的操作 */}
      <div role="status" className="px-4 pb-1 text-[11px] text-gray-500 leading-relaxed">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className={currentSemantic ? 'text-brand-700' : ''}>{searchStatus}</span>
          {currentSemantic && !['collecting', 'running'].includes(currentSemantic.phase) && <>
            {!currentSemantic.expanded && publicSearchCount > currentSemantic.candidates && <button className="text-brand-700 underline-offset-2 hover:underline" onClick={() => void handleSemanticSearch(true)}>{t('扩大到全部 {n} 条', { n: publicSearchCount })}</button>}
            <button className="text-brand-700 underline-offset-2 hover:underline" onClick={() => setSemanticView(null)}>{t('仅看本地结果')}</button>
          </>}
        </p>
        {currentSemantic?.message && <p className="text-amber-700">{currentSemantic.message}</p>}
      </div>

      <FilterPills activeType={activeType} onSelect={id => { setActiveType(id); setOnlyUncertain(false); }} collections={collections} onManage={() => setIsLibraryOpen(true)} />

      <div className="px-4 py-1 text-[11px] text-gray-500 flex items-center justify-between gap-2">
        <span className="shrink-0">{t('{n} 条收藏', { n: filteredAssets.length })}</span>
        <select aria-label={t('筛选处理状态')} className="min-w-0 text-[11px] rounded bg-transparent focus:outline-none" value={activeUseStatus} onChange={e => setActiveUseStatus(e.target.value)}><option value="all">{t('全部状态')}</option>{Object.entries(USE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
        {activeCollection && (onlyUncertain || assets.some(a => hasUncertainCollection(a, activeCollection))) && <button className="text-brand-700" onClick={() => setOnlyUncertain(!onlyUncertain)}>{onlyUncertain ? t('返回已归类') : t('待确认 {n}', { n: assets.filter(a => hasUncertainCollection(a, activeCollection)).length })}</button>}
      </div>
      {(classificationProgress.active || classificationProgress.total > 0) && <div role="status" className="px-4 py-1 text-[11px] text-gray-500 flex flex-wrap gap-2">
        <span>{classificationProgress.active ? t('Jev 归类中') : t('Jev 已处理')} {classificationProgress.done}/{classificationProgress.total}{classificationProgress.failed > 0 ? t(' · 请求失败，任务已暂停') : ''}</span>
        {classificationProgress.active ? <button className="text-brand-700" onClick={() => { cancelClassification.current = true; classificationAbort.current?.abort(); }}>{t('停止后续归类')}</button> : <button onClick={() => setClassificationProgress({ active: false, done: 0, total: 0, failed: 0 })}>{t('收起')}</button>}
      </div>}

      {(evidenceRun.active || pendingEvidenceCount > 0) && (
        <div role="status" className="px-4 py-1 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
          {evidenceRun.active ? <>
            <span>{t('读取网页简介 {done}/{total}', { done: evidenceRun.done, total: evidenceRun.total })}</span>
            <button onClick={() => evidenceAbort.current?.abort()} className="text-brand-700 dark:text-brand-400 hover:underline">{t('停止')}</button>
          </> : <>
            <span>{t('{n} 条收藏可读取网页公开简介，提高分类准确度（不调用模型）', { n: pendingEvidenceCount })}</span>
            <button onClick={handleReadEvidence} className="text-brand-700 dark:text-brand-400 hover:underline">{t('读取')}</button>
          </>}
        </div>
      )}
      {modelReady && (modelUpdate.active || staleCount > 0 || modelUpdate.message) && (
        <div role="status" className="px-4 py-1 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
          {modelUpdate.active ? <>
            <span>{t('{model}更新中 {done}/{total}', { model: searchModelLabel, done: Math.max(0, modelUpdate.total - pendingCount - processingCount), total: modelUpdate.total })}{failedCount > 0 ? t(' · 失败 {n}', { n: failedCount }) : ''}</span>
            <button onClick={stopModelUpdate} className="text-brand-700 dark:text-brand-400 hover:underline">{t('停止')}</button>
          </> : <>
            {staleCount > 0 && <span>{t('{n} 条收藏可用{model}更新', { n: staleCount, model: searchModelLabel })}{failedCount > 0 ? t('（含失败 {n}）', { n: failedCount }) : ''}</span>}
            {staleCount > 0 && <button onClick={handleUpdateAll} className="text-brand-700 dark:text-brand-400 hover:underline">{t('全部更新')}</button>}
            {modelUpdate.message && <span className="text-amber-700">{modelUpdate.message}</span>}
          </>}
        </div>
      )}

      {/* 书签卡片列表 */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs text-center px-4">
            <p>{t('暂无匹配的书签或场景')}</p>
            {assets.length === 0 && (
              <p className="mt-1 text-gray-500">{t('点击右上角刷新图标，一键导入浏览器收藏夹')}</p>
            )}
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <React.Fragment key={asset.id}>
            {semanticLabels.has(asset.id) && <p className="mx-4 mt-1 text-[10px] text-brand-700">{semanticLabels.get(asset.id)}</p>}
            <BookmarkCard
              asset={asset}
              onOpenRunbook={setRunbookAsset}
              onReanalyze={handleReanalyzeSingle}
              onChangeType={handleChangeType}
              onUpdateTags={handleUpdateTags}
              onOpenAsset={handleOpenAsset}
              onOrganize={asset => setOrganizingId(asset.id)}
              collectionNames={collections.filter(c => !c.assetType && belongsToCollection(asset, c, packs)).map(c => c.name)}
            />
            {onlyUncertain && activeCollection && <div className="mx-4 mb-3 flex gap-2 text-xs">
              <button onClick={() => void db.setCollectionMembership(asset.id, activeCollection.id, true)} className="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white">{t('加入「{name}」', { name: tLabel(activeCollection.name) })}</button>
              <button onClick={() => void db.setCollectionMembership(asset.id, activeCollection.id, false)} className="px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800">{t('不收录')}</button>
            </div>}
            </React.Fragment>
          ))
        )}
      </div>

      <RunbookModal
        asset={runbookAsset}
        isOpen={!!runbookAsset}
        onClose={() => setRunbookAsset(null)}
        onSave={handleSaveRunbook}
      />

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
      <LibraryModal isOpen={isLibraryOpen} collections={collections} packs={packs} jevReady={settings.modelProvider === 'jev' && modelIsReady(settings)} classifying={classificationProgress.active || processingCount > 0} onClassify={id => void handleClassifyExisting(id)} onClose={() => setIsLibraryOpen(false)} />
      <OrganizeAssetModal asset={assets.find(a => a.id === organizingId) || null} collections={collections} packs={packs} onClose={() => setOrganizingId(null)} onUpdateTags={handleUpdateTags} />
    </div>
  );
};
