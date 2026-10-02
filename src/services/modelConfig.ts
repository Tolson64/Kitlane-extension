import type { AppSettings, ModelProvider } from '../types/domain';
import { getJevEndpoint } from './jevService';
import { t } from '../i18n';

// 通用大模型的常用接口地址：只是快捷填写，模型来源统一为「通用大模型」。
export const ADDRESS_PRESETS: { name: string; baseUrl: string; modelName?: string }[] = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  { name: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4-flash' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'Ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
  { name: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' }
];

// 旧版的厂商取值统一归为通用大模型。
export function normalizeProvider(provider: ModelProvider): ModelProvider {
  return provider === 'deepseek' || provider === 'glm' || provider === 'local_chat' ? 'custom' : provider;
}

function isLoopback(endpoint: URL): boolean {
  return ['localhost', '127.0.0.1'].includes(endpoint.hostname);
}

export function usesLocalModelEndpoint(settings: AppSettings): boolean {
  try { return settings.modelProvider !== 'jev' && isLoopback(new URL(settings.baseUrl.trim())); } catch { return false; }
}

export function getChatEndpoint(settings: AppSettings): URL {
  let endpoint: URL;
  try { endpoint = new URL(settings.baseUrl.trim()); } catch { throw new Error(t('请填写有效的模型接口地址')); }
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error(t('接口地址不能包含账号密码、查询参数或片段；密钥请填在 Key 栏'));
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && isLoopback(endpoint))) throw new Error(t('云端接口须使用 HTTPS，本地接口须使用 localhost 或 127.0.0.1'));
  if (settings.modelProvider === 'local_chat' && !isLoopback(endpoint)) throw new Error(t('本地通用模型只允许连接 localhost 或 127.0.0.1'));
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions';
  return endpoint;
}

export function getSmartSearchConfig(settings: AppSettings) {
  if (!settings.allowRemoteEnrichment) throw new Error(t('请先在模型设置中允许分析公开收藏'));
  if (settings.modelProvider === 'laya_local') throw new Error(t('旧版决策接口仅用于分类；智能搜索请选择通用模型（兼容接口）'));
  if (settings.modelProvider === 'jev') return { kind: 'jev' as const, endpoint: getJevEndpoint(settings), model: settings.modelName || 'jev-1.13.0', local: false, jsonMode: false };
  const endpoint = getChatEndpoint(settings);
  const local = isLoopback(endpoint);
  if (!local && !settings.apiKey.trim()) throw new Error(t('云端模型需要填写 API Key'));
  if (!settings.modelName.trim()) throw new Error(local ? t('请填写本地服务中实际运行的模型名称') : t('请填写模型名称'));
  return { kind: 'chat' as const, endpoint, model: settings.modelName.trim(), local, jsonMode: settings.chatJsonMode !== false };
}

export function smartSearchIsReady(settings: AppSettings): boolean {
  try { getSmartSearchConfig(settings); return true; } catch { return false; }
}

export function modelAnalysisIsReady(settings: AppSettings): boolean {
  if (settings.modelProvider === 'laya_local') return settings.allowRemoteEnrichment && usesLocalModelEndpoint(settings) && Boolean(settings.modelName.trim());
  return smartSearchIsReady(settings);
}

// 标识当前模型配置；换提供方、接口地址或模型名后，已分析的收藏视为需要更新。
export function modelFingerprint(settings: AppSettings): string {
  return [normalizeProvider(settings.modelProvider), settings.baseUrl.trim().replace(/\/+$/, ''), settings.modelName.trim()].join('|');
}

// 界面上的模型称呼：不突出具体厂商，只区分决策模型（Jev 等）与大模型；出错提示仍用具体名称便于排查。
export function modelKindLabel(settings: AppSettings): string {
  return settings.modelProvider === 'jev' || settings.modelProvider === 'laya_local' ? t('决策模型') : t('大模型');
}

export function smartSearchModelLabel(settings: AppSettings): string {
  if (usesLocalModelEndpoint(settings)) return t('本地模型');
  return { jev: 'Jev', deepseek: t('大模型'), glm: t('大模型'), local_chat: t('本地模型'), laya_local: t('旧版决策接口'), custom: t('大模型') }[settings.modelProvider];
}

export function chatResponseFormat(settings: AppSettings, schema: Record<string, unknown>, name: string) {
  if (settings.chatJsonMode === false) return undefined;
  return usesLocalModelEndpoint(settings)
    ? { type: 'json_schema', json_schema: { name, strict: true, schema } }
    : { type: 'json_object' };
}

// Called directly from Save's click handler, before any unrelated await, to retain the user gesture.
export async function requestModelHostAccess(settings: AppSettings): Promise<void> {
  if (!settings.allowRemoteEnrichment || settings.modelProvider === 'laya_local') return;
  const { endpoint } = getSmartSearchConfig(settings);
  const declaredHosts = ['api.deepseek.com', 'open.bigmodel.cn', 'api.typesafe.ai'];
  if ((endpoint.protocol === 'http:' && isLoopback(endpoint)) || (endpoint.protocol === 'https:' && declaredHosts.includes(endpoint.hostname))) return;
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) throw new Error(t('请在浏览器扩展中保存设置，以授权所填接口域名'));
  // Match patterns apply to the host; never grant all HTTPS hosts at once.
  const granted = await chrome.permissions.request({ origins: [`https://${endpoint.hostname}/*`] });
  if (!granted) throw new Error(t('未授权该接口域名，设置未保存；关键词搜索仍可使用'));
}
