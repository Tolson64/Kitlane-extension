import type { AssetType } from '../../types/domain';
import { lookupSite } from '../../data/siteKnowledge';

function isHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

// —— 公网上的私人页面：账号后台、个人或团队的文档与文件、公司内部系统 ——
// 这些页面只在本机处理：不发给模型、不抓取网页；产品官网首页仍按公开处理。
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
const SECRET_QUERY = /^(token|access_token|id_token|key|apikey|api_key|secret|sig|signature|session|sessionid|sid|auth|code|password|passwd|ticket)$/i;

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
  return [...parsed.searchParams.keys()].some(key => SECRET_QUERY.test(key));
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
