export interface WebPageMeta { title: string; description: string; ogType: string; loginRequired?: boolean; }

const MAX_HTML_BYTES = 256 * 1024;

function plainText(value: string, limit: number): string {
  // Decode entities in text only; never parse the fetched document or its resources.
  const safe = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doc = new DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  return (doc.body.textContent || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function parsePageMeta(html: string): WebPageMeta {
  const head = html.split(/<\/head\s*>|<body\b/i, 1)[0]
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '');
  const title = plainText(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '', 160);
  const descriptions = new Map<string, string>();
  let ogType = '';
  for (const token of head.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []) {
    const attributes: Record<string, string> = {};
    for (const match of token.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    }
    const name = (attributes.name || attributes.property || '').toLowerCase();
    if (name === 'og:type' && attributes.content && !ogType) ogType = plainText(attributes.content, 40).toLowerCase();
    if (['description', 'og:description', 'twitter:description'].includes(name) && attributes.content) {
      descriptions.set(name, plainText(attributes.content, 500));
    }
  }
  return { title, description: descriptions.get('description') || descriptions.get('og:description') || descriptions.get('twitter:description') || '', ogType };
}

// 需要登录的迹象：登录页标题、登录路径、登录类子域名。反爬验证页（Just a moment、安全验证）不算。
const LOGIN_TITLE = /^\s*(sign\s?in|log\s?in|登录|请登录|用户登录|统一身份认证|单点登录|sso\b|authentication required|unauthorized)|请先登录|sign in to continue|log in to continue/i;
const LOGIN_PATH = /(^|\/)(login|log-in|signin|sign-in|sso|cas|oauth2?|authorize|passport|users\/sign_in)(\/|$|\.)/i;
const LOGIN_HOST_LABEL = new Set(['login', 'sso', 'passport', 'auth', 'accounts', 'signin', 'idp', 'cas']);

const isHtml = (response: Response) => /^(text\/html|application\/xhtml\+xml)\b/i.test(response.headers.get('content-type') || '');

async function readHtml(response: Response, signal: AbortSignal, maxBytes = MAX_HTML_BYTES): Promise<string> {
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < maxBytes) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = value.slice(0, maxBytes - size);
      chunks.push(chunk); size += chunk.length;
    }
  } finally { await reader.cancel().catch(() => {}); }
  signal.throwIfAborted();
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const charset = response.headers.get('content-type')?.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] || 'utf-8';
  let decoder: TextDecoder;
  try { decoder = new TextDecoder(charset); } catch { decoder = new TextDecoder(); }
  return decoder.decode(bytes);
}

// 跳转目标是否为登录页：只用于判断是否需要登录，读到的内容不作为这条收藏的资料。
// 跳到其他未授权网站时浏览器不允许读取，此时不作判断。
async function redirectsToLogin(url: string, init: RequestInit, signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(url, { ...init, redirect: 'follow' });
    const final = new URL(response.url);
    if (response.status === 401 || LOGIN_PATH.test(final.pathname) || LOGIN_HOST_LABEL.has(final.hostname.split('.')[0])) return true;
    const html = isHtml(response) && response.body ? await readHtml(response, signal, 64 * 1024) : '';
    return LOGIN_TITLE.test(parsePageMeta(html).title);
  } catch {
    return false;
  }
}

// 读取公开网页的标题、简介和页面类型。不携带登录信息、不跟随跳转（跳转后的页面不是这条收藏本身）。
// loginRequired 表示该页需要登录才能查看，调用方据此把收藏转为仅本机处理。
export async function fetchPageMeta(url: string, signal?: AbortSignal): Promise<WebPageMeta> {
  const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8_000)]);
  const init: RequestInit = { method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', signal: requestSignal, headers: { Accept: 'text/html,application/xhtml+xml' } };
  const response = await fetch(url, { ...init, redirect: 'manual' });
  if (response.type === 'opaqueredirect') {
    if (await redirectsToLogin(url, init, requestSignal)) return { title: '', description: '', ogType: '', loginRequired: true };
    throw new Error('Redirected');
  }
  const html = isHtml(response) && response.body ? await readHtml(response, requestSignal) : '';
  const meta = html ? parsePageMeta(html) : { title: '', description: '', ogType: '' };
  if (response.status === 401 || ((response.ok || response.status === 403) && LOGIN_TITLE.test(meta.title))) return { ...meta, loginRequired: true };
  if (!response.ok || !html) throw new Error('No public HTML metadata');
  return meta;
}
