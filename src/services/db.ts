import Dexie, { type Table } from 'dexie';
import { Asset, AppSettings, Collection, TagPack, DEFAULT_SETTINGS } from '../types/domain';
import { DEFAULT_COLLECTIONS, DEFAULT_TAG_PACKS, LIFE_PACK_IDS, resolveTagPacks } from '../data/tagPacks';
import { isLocalOnly, detectAssetType } from './adapters/router';
import { needsModelAnalysis } from './classification';
import { normalizeProvider } from './modelConfig';

export class SceneMarkDatabase extends Dexie {
  assets!: Table<Asset, string>;
  collections!: Table<Collection, string>;
  tagPacks!: Table<TagPack, string>;
  settingsTable!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('SceneMarkDB');
    
    // 版本定义，支持后续无痛迁移扩展
    this.version(1).stores({
      assets: '&id, bookmarkId, url, assetType, *scenes, isPrivate, enrichmentStatus, updatedAt',
      settingsTable: '&key'
    });
    this.version(2).stores({
      collections: '&id, order, name',
      tagPacks: '&id, order'
    }).upgrade(async tx => {
      await tx.table('collections').bulkPut(DEFAULT_COLLECTIONS);
      await tx.table('tagPacks').bulkPut(DEFAULT_TAG_PACKS);
      await tx.table('assets').toCollection().modify((asset: Asset) => {
        if (!asset.userEditedType && asset.enrichmentStatus === 'pending' && asset.assetType === 'tool') asset.assetType = detectAssetType(asset.url);
      });
    });
    // 内置标签包改为默认全部启用；只动未编辑过的内置包（updatedAt 仍为初始值 1）。
    this.version(3).stores({}).upgrade(async tx => {
      const builtIn = new Set(DEFAULT_TAG_PACKS.map(p => p.id));
      await tx.table('tagPacks').toCollection().modify((pack: TagPack) => {
        if (builtIn.has(pack.id) && pack.updatedAt === 1) pack.enabled = true;
      });
    });
    // 生活类标签包改为默认关闭；同样只动未编辑过的内置包。
    this.version(4).stores({}).upgrade(async tx => {
      await tx.table('tagPacks').toCollection().modify((pack: TagPack) => {
        if (LIFE_PACK_IDS.has(pack.id) && pack.updatedAt === 1) pack.enabled = false;
      });
    });
    // 新增 AI 工具、投资研究两个内置包；个人理财改为默认关闭；从模板建的收藏集补上按标签收录。
    this.version(5).stores({}).upgrade(async tx => {
      const table = tx.table('tagPacks');
      const stored: TagPack[] = await table.toArray();
      const ids = new Set(stored.map(p => p.id));
      const generalOrder = stored.find(p => p.id === 'general')?.order ?? 0;
      const lastOrder = Math.max(0, ...stored.map(p => p.order));
      for (const pack of DEFAULT_TAG_PACKS.filter(p => ['ai-tools', 'invest'].includes(p.id) && !ids.has(p.id))) {
        await table.add({ ...pack, order: pack.id === 'ai-tools' ? generalOrder + 0.5 : lastOrder + 1 });
      }
      await table.toCollection().modify((pack: TagPack) => {
        if (pack.id === 'finance' && pack.updatedAt === 1) pack.enabled = false;
      });
      const packsById = new Map(resolveTagPacks(await table.toArray()).map(p => [p.id, p]));
      await tx.table('collections').toCollection().modify((collection: Collection) => {
        if (!collection.assetType && !collection.tagLabels && collection.packIds?.length) {
          collection.tagLabels = [...new Set(collection.packIds.flatMap(id => packsById.get(id)?.tags.map(t => t.label) || []))];
        }
      });
    });
    this.on('populate', async tx => {
      await tx.table('collections').bulkPut(DEFAULT_COLLECTIONS);
      await tx.table('tagPacks').bulkPut(DEFAULT_TAG_PACKS);
    });
  }

  // 标签包一律经这里读取：未编辑的内置包使用代码中的最新定义。
  async getTagPacks(): Promise<TagPack[]> {
    return resolveTagPacks(await this.tagPacks.toArray());
  }

  // 获取设置
  async getSettings(): Promise<AppSettings> {
    const record = await this.settingsTable.get('app_settings');
    if (!record) return DEFAULT_SETTINGS;
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...record.value };
    return { ...settings, modelProvider: normalizeProvider(settings.modelProvider) };
  }

  // 保存设置
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.settingsTable.put({ key: 'app_settings', value: { ...current, ...settings } });
  }

  // 批量保存/更新书签
  async upsertAssets(assets: Asset[]): Promise<void> {
    await this.assets.bulkPut(assets);
  }

  async deleteCollection(id: string): Promise<void> {
    await this.transaction('rw', this.collections, this.assets, async () => {
      await this.collections.delete(id);
      await this.assets.toCollection().modify(asset => {
        if (asset.collectionOverrides) delete asset.collectionOverrides[id];
        if (asset.collectionJudgments) delete asset.collectionJudgments[id];
      });
    });
  }

  async setCollectionMembership(assetId: string, collectionId: string, included: boolean): Promise<void> {
    await this.transaction('rw', this.assets, this.collections, async () => {
      const collection = await this.collections.get(collectionId);
      if (!collection) return;
      await this.assets.where('id').equals(assetId).modify(asset => {
        asset.collectionOverrides = { ...asset.collectionOverrides, [collectionId]: included };
        if (collection.assetType === 'private' && included) {
          asset.isPrivate = true;
          asset.assetType = 'private';
          asset.userEditedType = true;
          asset.enrichmentStatus = 'skipped';
        }
        asset.updatedAt = Date.now();
      });
    });
  }

  // 根据 URL 获取资产
  async getAssetByUrl(url: string): Promise<Asset | undefined> {
    return await this.assets.where('url').equals(url).first();
  }

  // 获取待处理的任务队列
  async getPendingAssets(limit = 10): Promise<Asset[]> {
    return await this.assets
      .where('enrichmentStatus')
      .equals('pending')
      .and(a => !isLocalOnly(a))
      .limit(limit)
      .toArray();
  }

  async claimPendingAssets(limit: number): Promise<Asset[]> {
    return this.transaction('rw', this.assets, async () => {
      const pending = await this.getPendingAssets(limit);
      const startedAt = Date.now();
      for (const asset of pending) {
        await this.assets.update(asset.id, { enrichmentStatus: 'processing', enrichmentStartedAt: startedAt });
      }
      return pending;
    });
  }

  async skipPrivatePending(): Promise<number> {
    return this.assets.where('enrichmentStatus').equals('pending')
      .and(asset => isLocalOnly(asset))
      .modify({ isPrivate: true, enrichmentStatus: 'skipped' });
  }

  async recoverStaleAnalyses(olderThan: number): Promise<number> {
    return this.assets.where('enrichmentStatus').equals('processing')
      .and(asset => !asset.enrichmentStartedAt || asset.enrichmentStartedAt < olderThan)
      .modify({ enrichmentStatus: 'pending', enrichmentStartedAt: undefined });
  }

  // 把尚未被当前模型分析过的公开收藏（含失败项）放回待分析队列。
  async queueForModel(modelKey: string, collections: Collection[] = []): Promise<number> {
    return this.assets.filter(asset => needsModelAnalysis(asset, modelKey, collections))
      .modify({ enrichmentStatus: 'pending', enrichmentStartedAt: undefined });
  }
}

export const db = new SceneMarkDatabase();
