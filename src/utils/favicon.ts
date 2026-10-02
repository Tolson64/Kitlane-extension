export function getBookmarkFaviconUrl(pageUrl: string): string | undefined {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return undefined;
  try {
    const page = new URL(pageUrl);
    if (!['http:', 'https:', 'file:', 'chrome:', 'edge:'].includes(page.protocol)) return undefined;
    const icon = new URL(chrome.runtime.getURL('/_favicon/'));
    icon.searchParams.set('pageUrl', page.href);
    icon.searchParams.set('size', '32');
    return icon.href;
  } catch {
    return undefined;
  }
}
