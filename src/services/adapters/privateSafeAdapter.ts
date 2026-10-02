import { Asset } from '../../types/domain';
import { t } from '../../i18n';

export function enrichPrivateAsset(asset: Asset): Partial<Asset> {
  const urlLower = asset.url.toLowerCase();
  const titleLower = asset.title.toLowerCase();

  const scenes: string[] = ['#私有资产', '#本地隔离'];
  
  if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1') || urlLower.includes('192.168.')) {
    scenes.push('#局域网服务');
  } else if (urlLower.includes('console') || urlLower.includes('admin') || urlLower.includes('dashboard')) {
    scenes.push('#运维后台');
  }

  return {
    assetType: 'private',
    isPrivate: true,
    enrichmentStatus: 'skipped',
    scenes,
    features: [t('纯本地私密存储'), t('阻断云端请求')],
    summary: asset.title || t('私有本地后台资产'),
    runbookNotes: asset.runbookNotes
  };
}
