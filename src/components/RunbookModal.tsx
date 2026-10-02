import React, { useEffect, useState } from 'react';
import { X, Save, Terminal } from 'lucide-react';
import { Asset } from '../types/domain';
import { t } from '../i18n';

interface RunbookModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetId: string, notes: string) => Promise<void>;
}

export const RunbookModal: React.FC<RunbookModalProps> = ({ asset, isOpen, onClose, onSave }) => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setNotes(asset?.runbookNotes || ''); }, [asset?.id, isOpen]);
  if (!isOpen || !asset) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(asset.id, notes);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Terminal className="w-4 h-4 text-brand-500" />
            <span>{t('实操避坑备忘 (Runbook)')}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 truncate font-mono">
            {asset.title}
          </p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('记录此工具的专用命令、避坑要点或账号到期备忘，例如：\n• pip install -r requirements.txt\n• 免费版每天限额 5 次\n• 年付订阅，2027 年 3 月到期')}
            rows={5}
            className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 resize-none"
          />

          <div className="flex justify-end space-x-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              {t('取消')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center gap-1 font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('保存中...') : t('保存备忘')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
