export type AssetType = 'repo' | 'tool' | 'inspiration' | 'article' | 'private' | 'other';

export interface Asset {
  id: string; // 唯一实体 UUID
  bookmarkId?: string; // 关联的 Chrome 原生书签 ID（若有）
  folderName?: string; // 原生目录名称（只读来源）
  url: string;
  title: string;
  userTitle?: string;
  assetType: AssetType;
  
  // 核心场景与功能元数据
  scenes: string[]; // 适用场景标签（例如：#批量压制 #封面生成 #逆向工具）
  features: string[]; // 核心功能要点
  summary: string; // 一句话定位
  
  // 异构扩展字段
  language?: string; // 代码语言 (如 TypeScript, Python)
  stars?: number; // GitHub Stars
  thumbnail?: string; // 视觉灵感预览缩略图 (base64 或 URL)
  
  // 实战备忘与避坑手册 (Runbook / Cheat Sheet)
  runbookNotes?: string; // 用户私密笔记、安装命令、避坑要点
  userEditedType?: boolean;
  userEditedScenes?: boolean;
  openedAt?: number;
  collectionOverrides?: Record<string, boolean>; // 手动加入/排除，优先于自动判断
  collectionJudgments?: Record<string, ClassificationJudgment>;
  tagJudgments?: Record<string, ClassificationJudgment>;
  sourceText?: string; // 隐藏的原始资料，供搜索/分类使用；不包含个人备忘
  pageEvidence?: { checkedAt: number; status: 'ready' | 'empty' | 'unavailable' | 'login'; ogType?: string }; // login：读取时发现需要登录，按私密处理 // ogType：网页自己声明的类型（如 article、video.other）
  useStatus?: UseStatus; // 用户选择的处理状态，模型不推断
  
  // 隐私控制
  isPrivate: boolean; // 是否物理隔离，禁止云端 AI 请求
  enrichmentStatus: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  enrichmentStartedAt?: number;
  lastEnrichedAt?: number;
  analyzedWith?: string; // 最近一次成功分析所用的模型（提供方|接口地址|模型名），换模型后据此判断需要更新
  
  // 时间与排序
  createdAt: number;
  updatedAt: number;
}

export type ClassificationDecision = 'match' | 'no_match' | 'uncertain';
export type UseStatus = 'unmarked' | 'to_read' | 'to_try' | 'in_use' | 'done';
export const USE_STATUS_LABELS: Record<UseStatus, string> = { unmarked: '未设置', to_read: '待读', to_try: '待试', in_use: '在用', done: '已完成' };

export interface ClassificationJudgment {
  decision: ClassificationDecision;
  ruleVersion: number;
  confidence?: number;
  probabilities?: Record<string, number>;
  model?: string;
  requestedModel?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  tagLabels?: string[]; // 带这些标签（不含 #）的收藏自动收录；标签改进会自动反映到收藏集
  assetType?: AssetType;
  packIds: string[];
  order: number;
  updatedAt: number;
}

export interface TagDefinition {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  domains?: string[];
}

export interface TagPack {
  id: string;
  name: string;
  enabled: boolean;
  tags: TagDefinition[];
  order: number;
  updatedAt: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  userTitle: string;
  url: string;
  assetType: string;
  scenesText: string;
  featuresText: string;
  summary: string;
  runbookText: string;
  statusText: string;
  sourceText: string;
  folderName: string;
}

// custom：通用大模型（OpenAI 兼容接口，云端或本机）。deepseek、glm、local_chat 为旧版取值，读取设置时统一归为 custom。
export type ModelProvider = 'deepseek' | 'glm' | 'jev' | 'local_chat' | 'laya_local' | 'custom';

export interface AppSettings {
  modelProvider: ModelProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  concurrencyLimit: number; // 默认并发数 (如 3)
  enableLocalOnlyWhitelist: boolean; // 自动识别并隔离 VPN/内网/Token 链接
  allowRemoteEnrichment: boolean;
  autoEnrichEnabled: boolean;
  chatJsonMode: boolean;
  language?: 'auto' | 'zh' | 'en'; // 界面语言，auto 跟随浏览器
}

export const DEFAULT_SETTINGS: AppSettings = {
  modelProvider: 'custom',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  concurrencyLimit: 3,
  enableLocalOnlyWhitelist: true,
  allowRemoteEnrichment: false,
  autoEnrichEnabled: false,
  chatJsonMode: true,
  language: 'auto'
};
