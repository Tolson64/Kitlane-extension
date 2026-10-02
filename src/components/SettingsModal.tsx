import React, { useEffect, useState } from 'react';
import { X, Save, Cpu } from 'lucide-react';
import { AppSettings, ModelProvider } from '../types/domain';
import { ADDRESS_PRESETS, getSmartSearchConfig, requestModelHostAccess, usesLocalModelEndpoint } from '../services/modelConfig';
import { t, tLabel } from '../i18n';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setForm({ ...settings }); setError(''); } }, [isOpen, settings]);
  if (!isOpen) return null;

  const handleProviderChange = (provider: ModelProvider) => {
    let baseUrl = form.baseUrl;
    let modelName = form.modelName;

    if (provider === 'jev') {
      baseUrl = 'https://api.typesafe.ai/v1';
      modelName = 'jev-1.13.0';
    } else if (provider === 'laya_local') {
      baseUrl = 'http://127.0.0.1:8000/v1';
      modelName = 'laya-421m';
    } else if (provider === 'custom') {
      baseUrl = '';
      modelName = '';
    }

    setError('');
    setForm({ ...form, modelProvider: provider, baseUrl, modelName, apiKey: provider === form.modelProvider ? form.apiKey : '', autoEnrichEnabled: false, chatJsonMode: true });
  };

  const handleAddressPreset = (baseUrl: string, modelName = '') => {
    setError('');
    if (form.baseUrl.trim() === baseUrl) return;
    setForm({ ...form, baseUrl, modelName, apiKey: '', autoEnrichEnabled: false });
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      if (form.allowRemoteEnrichment && form.modelProvider !== 'laya_local') getSmartSearchConfig(form);
      await requestModelHostAccess(form);
      await onSave({ ...form, baseUrl: form.baseUrl.trim(), modelName: form.modelName.trim(), apiKey: form.apiKey.trim() });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('设置未保存，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={t('设置')} className="w-full max-w-sm max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Cpu className="w-4 h-4 text-brand-500" />
            <span>{t('设置')}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 text-xs overflow-y-auto min-h-0">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('界面语言')}</label>
            <select aria-label={t('界面语言')} value={form.language || 'auto'} onChange={e => setForm({ ...form, language: e.target.value as AppSettings['language'] })} className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500">
              <option value="auto">{t('跟随浏览器')}</option>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('模型来源')}
            </label>
            <select
              aria-label={t('模型来源')}
              value={form.modelProvider}
              onChange={(e) => handleProviderChange(e.target.value as ModelProvider)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            >
              <option value="custom">{t('通用大模型（兼容接口，云端或本机）')}</option>
              <option value="jev">{t('决策模型（Jev）：分类与搜索关联')}</option>
              <option value="laya_local">{t('旧版本地决策接口（仅分类）')}</option>
            </select>
          </div>

          {form.modelProvider === 'custom' && <div className="rounded-lg bg-brand-50 p-2.5 space-y-2 text-gray-600">
            <p>{t('OpenAI 兼容接口 · 云端 / 本机')} · {t('常用地址')}</p>
            <div className="flex flex-wrap gap-2">
              {ADDRESS_PRESETS.map(preset => <button key={preset.name} aria-pressed={form.baseUrl.trim() === preset.baseUrl} className={`rounded-md border border-brand-200 px-2 py-1 text-brand-700 ${form.baseUrl.trim() === preset.baseUrl ? 'bg-brand-100' : ''}`} onClick={() => handleAddressPreset(preset.baseUrl, preset.modelName)}>{tLabel(preset.name)}</button>)}
              <button aria-pressed={!form.baseUrl.trim()} className={`rounded-md border border-brand-200 px-2 py-1 text-brand-700 ${!form.baseUrl.trim() ? 'bg-brand-100' : ''}`} onClick={() => handleAddressPreset('')}>{t('自定义地址')}</button>
            </div>
            <p className="text-[11px]">{t('更换预设会清空模型名和 Key。')}</p>
          </div>}
          {form.modelProvider === 'laya_local' && <p className="text-gray-500">{t('仅用于分类，智能搜索请选大模型。')}</p>}

          <div className="space-y-1">
            <label className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.allowRemoteEnrichment} onChange={(e) => setForm({ ...form, allowRemoteEnrichment: e.target.checked, autoEnrichEnabled: e.target.checked && form.autoEnrichEnabled })} className="mt-0.5" />
              <span>{t('允许模型分析公开收藏')}</span>
            </label>
            <p className="pl-5 text-[11px] text-gray-500">{t('私密收藏和个人备忘不会发送。')}</p>
          </div>

          <label className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.autoEnrichEnabled} onChange={(e) => setForm({ ...form, autoEnrichEnabled: e.target.checked, allowRemoteEnrichment: e.target.checked || form.allowRemoteEnrichment })} className="mt-0.5" />
            <span>{t('自动分析待处理收藏')}{usesLocalModelEndpoint(form) ? '' : t('（可能计费）')}</span>
          </label>

          <details className="text-gray-500">
            <summary className="cursor-pointer text-brand-700">{t('连接与隐私说明')}</summary>
            <div className="mt-2 space-y-2 leading-relaxed text-[11px]">
              <p>{t('本机服务需先启动，填写实际模型名称；未启用认证时 Key 可留空。云端使用 HTTPS 和 Key，保存时仅申请所填域名的访问权限。')}</p>
              <p>{t('智能搜索发送搜索描述，以及公开收藏的原标题、网址路径、原收藏夹名、摘录和标签摘要。私密收藏、个人备忘和自定义标题留在本机。')}</p>
              <p>{t('导入、搜索或归类时可申请相关网站权限，读取公开网页的标题、描述和页面类型并存作隐藏资料，不携带登录信息；需要登录才能查看的页面会转为私密。拒绝授权仍可使用。')}</p>
              <p>{t('自动分析在侧栏打开时处理待分析和新导入的公开收藏；关闭会暂停后续请求。输入文字只做本地搜索，点击智能搜索或按回车才调用模型。云端调用可能计费，基础搜索和标签无需 Key。')}</p>
              <p>{t('接口不支持结构化返回时可关闭该选项；异常返回仍会保留关键词结果。')}</p>
            </div>
          </details>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key{usesLocalModelEndpoint(form) ? t('（可选）') : ''}
            </label>
            <input
              type="password"
              aria-label="API Key"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={usesLocalModelEndpoint(form) ? t('未启用认证可留空') : t('填写 API Key')}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('接口地址 (Base URL)')}
            </label>
            <input
              type="text"
              aria-label={t('接口地址 (Base URL)')}
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder={t('云端 HTTPS / 本机 localhost')}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          {form.modelProvider !== 'jev' && form.modelProvider !== 'laya_local' && <label className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.chatJsonMode !== false} onChange={e => setForm({ ...form, chatJsonMode: e.target.checked })} className="mt-0.5" />
            <span>{t('结构化返回（推荐）')}</span>
          </label>}

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('模型名称')}</label>
            <input aria-label={t('模型名称')} placeholder={usesLocalModelEndpoint(form) ? t('本机服务实际运行的模型名') : t('填写模型名称')} className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono" value={form.modelName} onChange={e => setForm({ ...form, modelName: e.target.value })} />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('同时分析数量')}</label>
            <select value={form.concurrencyLimit} onChange={(e) => setForm({ ...form, concurrencyLimit: Number(e.target.value) })} className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
              {[1, 2, 3, 5].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {error && <p role="alert" className="text-amber-700 leading-relaxed">{error}</p>}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              {t('取消')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center gap-1 font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('保存中...') : t('保存设置')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
