import React from 'react';
import { Download, Settings, RefreshCw } from 'lucide-react';
import { t } from '../i18n';

interface HeaderProps {
  onOpenSettings: () => void;
  onSyncBookmarks: () => void;
  onExport: () => void;
  isSyncing: boolean;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onSyncBookmarks,
  onExport,
  isSyncing,
  totalCount
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <img src="/icon/128.png" alt="Kitlane Logo" width={28} height={28} className="w-7 h-7 shrink-0 object-contain" />
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            Kitlane
            <span className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-normal px-1.5 py-0.5 rounded-full">
              {t('智能书签')}
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button onClick={onExport} title={t('导出本地资产 JSON')} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onSyncBookmarks}
          disabled={isSyncing}
          title={t('导入浏览器收藏夹；已配置模型时，同时用该模型更新全部收藏')}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
        </button>

        <button
          onClick={onOpenSettings}
          title={t('配置大模型与设置')}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
