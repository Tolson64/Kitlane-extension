import type { AssetType } from '../../types/domain';
import { lookupSite } from '../../data/siteKnowledge';

function isHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

// —— 公网上的私人页面：账号后台、个人或团队的文档与文件、公司内部系统、能力链接 ——
// 这些页面只在本机处理：不发给模型、不抓取网页；产品官网首页、普通仓库、文档和博客仍按公开处理。
// 子域名首段表示后台或账号入口（仅在三段及以上的主机名上生效，避免误伤 grafana.com 这类官网）。
const ACCOUNT_SUBDOMAINS = new Set(['mail', 'exmail', 'outlook', 'console', 'dashboard', 'dash', 'admin', 'seller', 'sellercentral', 'sellercentral-europe', 'creator', 'analytics', 'tagmanager', 'accounts', 'account', 'myaccount', 'my', 'login', 'signin', 'sso', 'passport', 'portal', 'oa', 'hr', 'erp-admin', 'jwxt', 'vpn', 'intranet', 'internal', 'jenkins', 'grafana', 'kibana', 'jira', 'confluence', 'gitlab', 'git', 'redash', 'metabase', 'superset', 'sentry', 'etax']);
// 整个主机就是个人后台或文件区。
const ACCOUNT_HOSTS = new Set(['business.facebook.com', 'adsmanager.facebook.com', 'pgy.xiaohongshu.com', 'ark.xiaohongshu.com', 'fxg.jinritemai.com', 'drive.google.com', 'onedrive.live.com', 'app.slack.com', 'app.netlify.com']);
// 团队或个人专属子域名的服务：除官网等公共子域名外，其余子域名都是某个团队的工作区。
const TENANT_DOMAINS = ['feishu.cn', 'feishu.net', 'larksuite.com', 'atlassian.net', 'slack.com', 'zendesk.com', 'sentry.io', 'myshopify.com', 'grafana.net', 'force.com'];
const PUBLIC_TENANT_SUBDOMAINS = new Set(['www', 'open', 'docs', 'develop', 'status', 'blog', 'help', 'support']);
// 在线文档、设计稿、网盘等：具体文件或分享链接视为私人内容（主机 → 首段路径）。
const PRIVATE_DOC_PATHS: Record<string, string[]> = {
  'docs.google.com': ['document', 'spreadsheets', 'presentation', 'forms', 'drawings'],
  'docs.qq.com': ['doc', 'sheet', 'slide', 'form', 'pdf', 'mind', 'flowchart', 'smartsheet', 'aio', 'desktop'],
  'figma.com': ['design', 'file', 'board', 'proto', 'slides', 'deck'],
  'overleaf.com': ['project', 'read'],
  'shimo.im': ['docs', 'sheets', 'slides', 'forms', 'folder', 'desktop'],
  'kdocs.cn': ['l', 'p'],
  'pan.baidu.com': ['s', 'disk', 'share'],
  'alipan.com': ['s', 'drive'],
  'aliyundrive.com': ['s', 'drive'],
  'dropbox.com': ['s', 'scl', 'home', 'sh'],
  '123pan.com': ['s'],
  'pan.quark.cn': ['s', 'list'],
  'search.google.com': ['search-console'],
  'mp.weixin.qq.com': ['cgi-bin', 'wxopen', 'advanced']
};
// Notion 与语雀的公共页面路径；其余路径是某个工作区或知识库里的页面。
const NOTION_PUBLIC = new Set(['product', 'pricing', 'templates', 'help', 'about', 'blog', 'desktop', 'mobile', 'enterprise', 'customers', 'careers', 'login', 'signup', 'releases', 'integrations', 'ai', 'mail', 'calendar', 'sites', 'guides', 'startups']);
const YUQUE_PUBLIC = new Set(['help', 'about', 'dashboard', 'login', 'register', 'explore', 'download', 'pricing']);
// 路径前两段出现这些词，多为账号或后台页面。
const ACCOUNT_PATH_SEGMENTS = new Set(['settings', 'account', 'accounts', 'admin', 'dashboard', 'console', 'my', 'billing', 'inbox', 'cgi-bin', 'portal', 'workspace']);
const SECRET_QUERY = /^(token|access_token|id_token|key|apikey|api_key|secret|sig|signature|session|sessionid|sid|auth|code|password|passwd|ticket|pwd|passcode|reset_token|invite)$/i;

// 能力链接：邀请、分享、重置、验证、魔法链接等，后面跟着难以猜测的令牌。
// 下划线会先折成连字符再匹配，所以 reset_password 与 reset-password 同一条规则。
const CAPABILITY_SEGMENTS = new Set([
  'reset', 'reset-password', 'password-reset', 'forgot-password',
  'verify', 'verification', 'verify-email', 'email-verification', 'email-verify', 'email-confirm',
  'confirm', 'confirmation', 'confirm-email',
  'magic', 'magic-link', 'magic-login', 'login-link', 'sign-in-link', 'signin-link', 'one-time-login',
  'invite', 'invites', 'invitation', 'invitations', 'shared-invite',
  'share', 'shares', 'shared',
  'token', 'tokens', 'redeem', 'redemption', 'unsubscribe',
  'activate', 'activation', 'recover', 'recovery', 'account-recovery'
]);
// 公开代码托管上的提交哈希、仓库名本身是公开内容。秘密 Gist 走单独规则，不在此列。
const CODE_CONTENT_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org', 'gitee.com', 'codeberg.org'];

// 成人内容：属于敏感个人信息，默认只在本机处理（用户 2026-10-01 决定）。按域名、专用顶级域名和标题中的明显字样识别。
const ADULT_DOMAINS = ['pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com', 'eporner.com', 'beeg.com', 'txxx.com', 'hqporner.com', 'motherless.com', 'porn.com', 'onlyfans.com', 'fansly.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com', 'cam4.com', 'myfreecams.com', 'brazzers.com', 'javlibrary.com', 'javbus.com', 'javdb.com', 'missav.com', 'missav.ws', 'missav.ai', 'jable.tv', 'supjav.com', 'av01.tv', 'thisav.com', '91porn.com', 'hanime.tv', 'nhentai.net', 'e-hentai.org', 'exhentai.org', 'rule34.xxx', '18comic.vip'];
const ADULT_TLDS = new Set(['xxx', 'porn', 'adult', 'sex']);
const ADULT_TITLE_WORDS = ['porn', 'porno', 'hentai', 'nsfw', 'jav', 'onlyfans', 'xvideos', 'pornhub', 'sex video', 'adult video', 'adult videos'];
const ADULT_TITLE_CJK = ['色情', '成人视频', '成人影片', '成人影院', '成人网站', '黄色网站', '黄片', '无码', '在线av', 'av在线', '18禁', '里番', '福利视频'];

export function isAdultContent(url: string, title = ''): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (ADULT_DOMAINS.some(d => isHost(host, d)) || ADULT_TLDS.has(host.split('.').pop() || '')) return true;
  } catch { /* 无效网址只看标题 */ }
  const text = title.toLowerCase();
  return ADULT_TITLE_CJK.some(word => text.includes(word)) ||
    ADULT_TITLE_WORDS.some(word => new RegExp(`(^|[^a-z0-9])${word}($|[^a-z0-9])`).test(text));
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function looksLikeJwt(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(value);
}

// 博客、文档、标题式路径：word-word、2024-guide，或 word-word-<短 id>（Medium、Dev.to 一类）。
function isHumanSlug(value: string): boolean {
  const pieces = value.split(/[-_]/).filter(Boolean);
  if (pieces.length < 2) return false;
  const word = (piece: string) => /^[a-z]{2,24}$/i.test(piece);
  const plain = (piece: string) => word(piece) || /^(?:19|20)\d{2}$/.test(piece) || /^\d{1,4}$/.test(piece);
  if (pieces.every(plain) && pieces.some(word)) return true;
  const words = pieces.filter(word);
  if (words.length < 2 || words.length < pieces.length - 1) return false;
  const extras = pieces.filter(piece => !word(piece));
  return extras.length === 1 && /^[a-z0-9]{1,16}$/i.test(extras[0]);
}

function isDictionaryWord(value: string): boolean {
  return /^[a-z]{2,24}$/i.test(value);
}

function isVersion(value: string): boolean {
  return /^v?\d{1,4}(?:\.\d+){1,3}$/i.test(value);
}

function isDate(value: string): boolean {
  return /^(?:19|20)\d{2}(?:-\d{2}){1,2}$/.test(value);
}

// photo2024、es2020guide 这类带年份的普通词，不是令牌。
function isYearish(value: string): boolean {
  const stripped = value.replace(/(?:19|20)\d{2}/gi, '');
  return stripped !== value && /^[a-z]*$/i.test(stripped);
}

function isCamelPhrase(value: string): boolean {
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || /\d/.test(value)) return false;
  const pieces = value.split(/(?=[A-Z])/).filter(Boolean);
  return pieces.length >= 2 && pieces.every(piece => /^[A-Z][a-z]{2,}$/.test(piece) || /^[A-Z]{2,}$/.test(piece));
}

function isCapabilitySegment(segment: string): boolean {
  return CAPABILITY_SEGMENTS.has(segment.toLowerCase().replace(/_/g, '-'));
}

// 紧跟在 invite/share/reset/verify 等词后面的一段。短码只在已知产品上单独识别。
function looksLikeCapabilityToken(raw: string): boolean {
  const value = safeDecode(raw);
  if (!value || isHumanSlug(value) || isDictionaryWord(value) || isVersion(value) || isDate(value)) return false;
  if (value.length < 8 || value.length > 512) return false;
  if (looksLikeJwt(value) || isUuid(value)) return true;
  if (!/^[A-Za-z0-9._~+/-]+$/.test(value)) return false;
  if (/^[0-9a-f]{10,}$/i.test(value)) return true;
  if (isYearish(value) || isCamelPhrase(value)) return false;
  if (/\d/.test(value) && /[a-z]/i.test(value) && value.length >= 10) return true;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && value.length >= 12 && shannonEntropy(value) >= 3) return true;
  if (/^\d{16,}$/.test(value)) return true;
  return false;
}

// 没有敏感词时，只把整段都像密钥的路径当成私密：UUID、JWT、长十六进制、高熵令牌。
// 普通英文单词、带连字符的标题、纯数字（社交帖子 id）不在此列。
function looksLikeHighEntropySecret(raw: string): boolean {
  const value = safeDecode(raw);
  if (!value || isHumanSlug(value)) return false;
  if (looksLikeJwt(value) || isUuid(value)) return true;
  if (value.includes('.') || value.length < 22 || value.length > 256) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(value) || isCamelPhrase(value) || /^\d+$/.test(value)) return false;
  if (value.includes('-') || value.includes('_')) {
    if (value.split(/[-_]/).some(piece => /^[a-z]{4,}$/i.test(piece))) return false;
  }
  if (/^[0-9a-f]{32,}$/i.test(value) && /\d/.test(value) && /[a-f]/i.test(value)) return true;
  const classes = Number(/[a-z]/.test(value)) + Number(/[A-Z]/.test(value)) + Number(/\d/.test(value));
  if (classes < 2 || !(/\d/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value)))) return false;
  return shannonEntropy(value) >= 3.3;
}

function isCodeContentHost(host: string): boolean {
  if (host === 'gist.github.com') return false;
  return CODE_CONTENT_HOSTS.some(domain => isHost(host, domain));
}

function isZoomHost(host: string): boolean {
  return ['zoom.us', 'zoom.com', 'zoomgov.com', 'zoom.com.cn'].some(domain => isHost(host, domain));
}

// 产品本身的秘密链接：从网址看不出公开还是私密，路径会泄露访问能力，一律只留在本机。
function isKnownSecretLink(host: string, parts: string[]): boolean {
  const head = (parts[0] || '').toLowerCase();
  if (host === 'gist.github.com' && (parts.length >= 2 || (parts.length === 1 && looksLikeHighEntropySecret(parts[0])))) return true;
  if (host === 'discord.gg' && head.length >= 2) return true;
  if ((host === 'discord.com' || host.endsWith('.discord.com') || host === 'discordapp.com' || host.endsWith('.discordapp.com')) &&
    (head === 'invite' || head === 'invites') && parts.length >= 2) return true;
  if (host === 't.me' || host === 'telegram.me' || host === 'telegram.dog') {
    if (parts[0]?.startsWith('+')) return true;
    if ((head === 'joinchat' || head === 'c') && parts.length >= 2) return true;
  }
  if (isZoomHost(host)) {
    if (['j', 's', 'w', 'my'].includes(head) && parts[1]) return true;
    if (head === 'wc' && ['join', 'j'].includes((parts[1] || '').toLowerCase()) && parts[2]) return true;
  }
  if (host === 'we.tl' && parts.length >= 1) return true;
  if ((host === 'wetransfer.com' || host.endsWith('.wetransfer.com')) && head === 'downloads' && parts.length >= 2) return true;
  if ((host === 'chatgpt.com' || host === 'chat.openai.com') && (head === 'share' || head === 'c') && parts.length >= 2) return true;
  if (host === 'claude.ai' && (head === 'share' || head === 'chat') && parts.length >= 2) return true;
  return false;
}

function hasCapabilityToken(parts: string[], minIndex: number): boolean {
  for (let i = minIndex; i < parts.length - 1; i++) {
    if (isCapabilitySegment(parts[i]) && looksLikeCapabilityToken(parts[i + 1])) return true;
  }
  return false;
}

function isCapabilityUrl(parsed: URL, host: string): boolean {
  const parts = parsed.pathname.split('/').filter(Boolean).map(safeDecode);
  if (isKnownSecretLink(host, parts)) return true;
  // 代码托管的前两段是所有者和仓库名，仓库叫 reset-password 仍按公开处理。
  if (hasCapabilityToken(parts, isCodeContentHost(host) ? 2 : 0)) return true;
  if (!isCodeContentHost(host) && parts.some(looksLikeHighEntropySecret)) return true;
  return false;
}

function hasSecretParams(params: URLSearchParams): boolean {
  return [...params.keys()].some(key => SECRET_QUERY.test(key));
}

function hasSecretFragment(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return false;
  if (looksLikeJwt(raw) || looksLikeHighEntropySecret(raw)) return true;
  return raw.includes('=') && hasSecretParams(new URLSearchParams(raw));
}

// 是否只在本机处理（不发给任何模型、不抓取网页）：用户标记的私密、私密网址规则、成人内容、读取时发现需要登录。
// 所有外发前的检查都用它。
export function isLocalOnly(asset: { url: string; title?: string; isPrivate?: boolean; pageEvidence?: { status: string } }): boolean {
  return !!asset.isPrivate || asset.pageEvidence?.status === 'login' || isPrivateUrl(asset.url) || isAdultContent(asset.url, asset.title);
}

function isAccountOrPrivateContent(parsed: URL, hostname: string): boolean {
  const host = hostname.replace(/^www\./, '');
  const labels = host.split('.');
  const parts = parsed.pathname.split('/').filter(Boolean).map(p => p.toLowerCase());
  if (ACCOUNT_HOSTS.has(host)) return true;
  if (labels.length >= 3 && labels.some((label, i) => i < labels.length - 2 && ACCOUNT_SUBDOMAINS.has(label))) return true;
  for (const domain of TENANT_DOMAINS) {
    if (host.endsWith(`.${domain}`) && !PUBLIC_TENANT_SUBDOMAINS.has(host.slice(0, -domain.length - 1))) return true;
  }
  if (host === 'mp.weixin.qq.com' && parts.length === 0) return true; // 公众号后台首页；/s/ 文章为公开页面
  for (const [domain, prefixes] of Object.entries(PRIVATE_DOC_PATHS)) {
    if ((host === domain || host.endsWith(`.${domain}`)) && prefixes.includes(parts[0])) return true;
  }
  if (isHost(host, 'notion.so') && parts.length >= 1 && !NOTION_PUBLIC.has(parts[0])) return true;
  if (isHost(host, 'yuque.com') && parts.length >= 2 && !YUQUE_PUBLIC.has(parts[0])) return true;
  if (parts.slice(0, 2).some(p => ACCOUNT_PATH_SEGMENTS.has(p))) return true;
  if (hasSecretParams(parsed.searchParams) || hasSecretFragment(parsed.hash)) return true;
  if (isCapabilityUrl(parsed, host)) return true;
  return false;
}

/**
 * 需要只在本机处理的网址：本机与局域网地址，以及公网上的账号后台、私人文档与公司内部系统。
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    let ipv4 = hostname;
    if (hostname.startsWith('::ffff:')) {
      const parts = hostname.slice(7).split(':');
      if (parts.length === 2) {
        const high = parseInt(parts[0], 16), low = parseInt(parts[1], 16);
        ipv4 = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
      }
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return true;
    
    // 严格局域网与本地地址判定
    if (
      hostname === 'localhost' ||
      ipv4.startsWith('127.') ||
      hostname === '::1' || hostname === '::' ||
      /^(fc|fd)[0-9a-f]{2}:/.test(hostname) || /^fe[89ab][0-9a-f]:/.test(hostname) ||
      ipv4.startsWith('169.254.') ||
      ipv4.startsWith('192.168.') ||
      ipv4.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ipv4) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }
    if (isAccountOrPrivateContent(parsed, hostname)) return true;
  } catch (e) {
    // URL 解析失败时安全回退
  }
  return false;
}

// final：该判断已足够具体，不再叠加网站级标签和通用路径规则（如学术网站上的单篇论文页）。
interface UrlKnowledge { type?: AssetType; tags: string[]; final?: boolean; }

// 学术出版与论文平台：首页、检索页按知识库判断；单篇论文页一律是「论文阅读」。
const PAPER_HOSTS = ['sciencedirect.com', 'link.springer.com', 'onlinelibrary.wiley.com', 'tandfonline.com', 'academic.oup.com', 'cambridge.org', 'ieeexplore.ieee.org', 'dl.acm.org', 'jstor.org', 'nature.com', 'science.org', 'cell.com', 'pnas.org', 'plos.org', 'frontiersin.org', 'mdpi.com', 'thelancet.com', 'nejm.org', 'jamanetwork.com', 'bmj.com', 'semanticscholar.org', 'researchgate.net', 'europepmc.org', 'biorxiv.org', 'medrxiv.org', 'ssrn.com', 'cnki.net', 'wanfangdata.com.cn'];
const PAPER_PATH = new Set(['article', 'articles', 'doi', 'abs', 'pii', 'document', 'stable', 'publication', 'paper', 'fulltext', 'full', 'content', 'detail']);

const CODE_HOSTS = ['github.com', 'gitee.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org'];
const CODE_HOST_RESERVED = ['features', 'topics', 'trending', 'collections', 'orgs', 'users', 'settings', 'search', 'explore', 'marketplace', 'about', 'help', 'pricing', 'login', 'signup', 'sponsors', 'notifications'];
const HF_RESERVED = ['models', 'datasets', 'spaces', 'papers', 'docs', 'blog', 'pricing', 'learn', 'tasks', 'settings', 'login', 'join', 'organizations', 'collections', 'enterprise', 'chat'];

// 大平台上，同一网站的不同页面用途不同，按路径区分。只处理判断明确的页面，其余交给知识库。
function platformRule(host: string, parts: string[]): UrlKnowledge | undefined {
  if (CODE_HOSTS.some(d => isHost(host, d))) {
    if (parts.length >= 2 && !CODE_HOST_RESERVED.includes(parts[0])) return { type: 'repo', tags: ['代码仓库', '开源项目'] };
    if (['topics', 'trending', 'explore', 'collections'].includes(parts[0])) return { type: 'other', tags: ['开源项目'] };
    return { type: 'other', tags: [] };
  }
  if (isHost(host, 'huggingface.co')) {
    if (parts[0] === 'datasets' && parts.length >= 3) return { type: 'repo', tags: ['数据集'] };
    if (parts[0] === 'datasets') return { type: 'other', tags: ['数据集'] };
    if (parts[0] === 'spaces' && parts.length >= 3) return { type: 'tool', tags: ['模型工具'] };
    if (parts[0] === 'papers') return { type: 'article', tags: ['论文阅读'] };
    if (parts[0] === 'docs' || parts[0] === 'learn') return undefined;
    if (parts.length >= 2 && !HF_RESERVED.includes(parts[0])) return { type: 'repo', tags: ['模型工具'] };
    return { type: 'tool', tags: ['模型工具', '数据集'] };
  }
  if ((isHost(host, 'youtube.com') && ['watch', 'shorts', 'live'].includes(parts[0])) || host === 'youtu.be' ||
    (isHost(host, 'bilibili.com') && parts[0] === 'video') || host === 'b23.tv' ||
    (isHost(host, 'douyin.com') && parts[0] === 'video') || (isHost(host, 'tiktok.com') && parts[1] === 'video') ||
    (isHost(host, 'vimeo.com') && /^\d+$/.test(parts[0] || ''))) return { type: 'article', tags: ['视频'] };
  if (host === 'mp.weixin.qq.com' && parts[0] === 's') return { type: 'article', tags: ['文章'] };
  if (['stackoverflow.com', 'superuser.com', 'serverfault.com'].some(d => isHost(host, d)) || isHost(host, 'stackexchange.com')) {
    return parts[0] === 'questions' && parts.length >= 2 ? { type: 'article', tags: ['技术社区'] } : { type: 'other', tags: ['技术社区'] };
  }
  if (host === 'doi.org' || host === 'dx.doi.org') return { type: 'article', tags: ['论文阅读'], final: true };
  if (isHost(host, 'pubmed.ncbi.nlm.nih.gov') && /^\d+$/.test(parts[0] || '')) return { type: 'article', tags: ['论文阅读'], final: true };
  if (isHost(host, 'ncbi.nlm.nih.gov') && parts[0] === 'pmc' && parts[1] === 'articles') return { type: 'article', tags: ['论文阅读'], final: true };
  if (PAPER_HOSTS.some(d => isHost(host, d)) && parts.some(p => PAPER_PATH.has(p)) && parts.length >= 2) return { type: 'article', tags: ['论文阅读'], final: true };
  return undefined;
}

// 适用于任意网站的路径与子域名惯例。
function pathRule(parts: string[], pathname: string): UrlKnowledge | undefined {
  if (/\.pdf$/i.test(pathname)) return { type: 'article', tags: [] };
  const has = (...names: string[]) => parts.some(p => names.includes(p));
  if (has('docs', 'documentation', 'reference', 'api-reference')) return { type: 'article', tags: ['文档', '技术文档'] };
  if (has('blog', 'blogs', 'post', 'posts', 'article', 'articles')) return { type: 'article', tags: ['文章'] };
  if (has('tutorial', 'tutorials', 'learn', 'guide', 'guides')) return { type: 'article', tags: ['教程'] };
  if (has('news')) return { type: 'article', tags: ['新闻资讯'] };
  return undefined;
}
function subdomainRule(host: string): UrlKnowledge | undefined {
  const first = host.split('.')[0];
  if (host.split('.').length < 3) return undefined;
  if (['docs', 'developer', 'developers', 'devdocs'].includes(first)) return { type: 'article', tags: ['文档', '技术文档'] };
  if (first === 'wiki') return { type: 'article', tags: ['文档'] };
  if (first === 'blog') return { type: 'article', tags: ['文章'] };
  if (first === 'learn') return { type: 'article', tags: ['教程'] };
  if (first === 'news') return { type: 'article', tags: ['新闻资讯'] };
  return undefined;
}

// 无需模型的网址判断：平台路径 → 通用路径 → 知识库（本站）→ 通用子域名 → 知识库（父域名）。
// 类型取第一个给出类型的规则；标签合并各规则结果，父域名只在前面都没有命中时使用。
export function urlKnowledge(url: string): UrlKnowledge {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { tags: [] }; }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const parts = parsed.pathname.toLowerCase().split('/').filter(Boolean);
  const platform = platformRule(host, parts);
  if (platform?.final) return { type: platform.type, tags: platform.tags };
  const site = lookupSite(parsed);
  const layers = [platform, pathRule(parts, parsed.pathname), site?.exact ? site : undefined, subdomainRule(host)].filter(Boolean) as UrlKnowledge[];
  if (!layers.length && site) layers.push(site);
  return { type: layers.find(l => l.type)?.type, tags: [...new Set(layers.flatMap(l => l.tags))] };
}

export function detectAssetType(url: string): AssetType {
  if (isPrivateUrl(url)) return 'private';
  return urlKnowledge(url).type || 'other';
}
