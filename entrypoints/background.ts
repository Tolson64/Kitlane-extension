import { db } from '../src/services/db';
import { detectAssetType, isLocalOnly } from '../src/services/adapters/router';
import { enrichPrivateAsset } from '../src/services/adapters/privateSafeAdapter';
import { Asset } from '../src/types/domain';

export default defineBackground(() => {
  console.log('Kitlane Background Service Worker initialized.');

  // 1. 设置点击扩展图标直接打开 Side Panel (Chrome 116+)
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  // 2. 监听浏览器书签创建事件
  chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    if (!bookmark.url) return; // 忽略文件夹

    const existing = await db.assets.where('bookmarkId').equals(id).first();
    if (existing) return;

    const assetType = detectAssetType(bookmark.url);
    const localOnly = assetType === 'private' || isLocalOnly({ url: bookmark.url, title: bookmark.title });
    const parent = bookmark.parentId ? await chrome.bookmarks.get(bookmark.parentId).catch(() => []) : [];
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      bookmarkId: id,
      folderName: parent[0]?.title,
      url: bookmark.url,
      title: bookmark.title || bookmark.url,
      assetType,
      scenes: [],
      features: [],
      summary: '',
      isPrivate: localOnly,
      enrichmentStatus: localOnly ? 'skipped' : 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (assetType === 'private') {
      const enriched = enrichPrivateAsset(newAsset);
      Object.assign(newAsset, enriched);
    }

    await db.upsertAssets([newAsset]);
    console.log('新书签已自动录入 Kitlane:', bookmark.title);
  });

  // 保留用户在插件中写下的标签和备忘；只断开原生书签关联。
  chrome.bookmarks.onRemoved.addListener(async (id) => {
    const asset = await db.assets.where('bookmarkId').equals(id).first();
    if (asset) {
      await db.assets.update(asset.id, { bookmarkId: undefined, updatedAt: Date.now() });
    }
  });

  chrome.bookmarks.onChanged.addListener(async (id, change) => {
    const asset = await db.assets.where('bookmarkId').equals(id).first();
    if (!asset) return;
    if (change.title !== undefined) asset.title = change.title;
    asset.collectionJudgments = undefined;
    asset.tagJudgments = undefined;
    if (change.url !== undefined) {
      asset.url = change.url;
      asset.sourceText = undefined;
      asset.pageEvidence = undefined;
      if (!asset.userEditedType) asset.assetType = detectAssetType(change.url);
    }
    // 改名或改网址后可能变成私密（如成人内容标题）：一经判定即保持本机处理。
    if (isLocalOnly(asset)) {
      asset.isPrivate = true;
      asset.enrichmentStatus = 'skipped';
    } else {
      asset.enrichmentStatus = 'pending';
    }
    asset.updatedAt = Date.now();
    await db.assets.put(asset);
  });
  chrome.bookmarks.onMoved.addListener(async (id, info) => {
    const asset = await db.assets.where('bookmarkId').equals(id).first();
    if (!asset) return;
    const parent = await chrome.bookmarks.get(info.parentId).catch(() => []);
    await db.assets.update(asset.id, { folderName: parent[0]?.title, collectionJudgments: undefined, tagJudgments: undefined, enrichmentStatus: isLocalOnly(asset) ? 'skipped' : 'pending', updatedAt: Date.now() });
  });
});
