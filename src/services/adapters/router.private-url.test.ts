import { describe, expect, it } from 'vitest';
import { detectAssetType, isLocalOnly } from './router';

const localOnly = [
  'https://gist.github.com/octocat/1a2b3c4d5e6f7890abcdef1234567890',
  'https://gist.github.com/octocat/6cad326836d38bd3a7d4',
  'https://Gist.GitHub.com/octocat/1a2b3c4d5e6f7890abcdef1234567890/',
  'https://discord.gg/abc123',
  'https://discord.gg/minecraft',
  'https://discord.com/invite/abc123XYZ',
  'https://discordapp.com/invite/abc123XYZ',
  'https://t.me/+AbCdEfGhIjKlMn',
  'https://telegram.me/+AbCdEfGhIjKlMn',
  'https://t.me/joinchat/AAAAAEfGhIjKlMnOpQr',
  'https://t.me/c/1234567890/42',
  'https://zoom.us/j/1234567890',
  'https://us02web.zoom.us/j/1234567890?pwd=abcDEF123',
  'https://zoom.us/wc/join/1234567890',
  'https://zoom.us/my/personalroom',
  'https://wetransfer.com/downloads/8f3a9c1e7b2d4f6a8c0b',
  'https://we.tl/t-AbCdEfGh12',
  'https://chatgpt.com/share/67f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  'https://chat.openai.com/share/67f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  'https://chatgpt.com/c/67f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  'https://claude.ai/share/67f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  'https://claude.ai/chat/67f1a2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
  'https://example.com/reset-password/8f3a9c1e7b2d4f6a',
  'https://example.com/Reset-Password/8f3a9c1e7b2d4f6a',
  'https://example.com/users/password_reset/8f3a9c1e7b2d4f6a',
  'https://example.com/verify/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  'https://example.com/magic-link/a8f3c91e2b704d6f9c1a',
  'https://example.com/invite/k3J8sL0pQw2nMx',
  'https://example.com/shared_invite/zt-1a2b3c4d-Ab9kL2mN4pQ8',
  'https://example.com/d/Ab9kL2mN4pQ8rS1tUv3Wx5Yz7',
  'https://files.example.com/550e8400-e29b-41d4-a716-446655440000',
  'https://example.com/watch?pwd=not-a-public-page',
  'https://app.example.com/login#token=8f3a9c1e7b2d4f6a',
  'https://example.com/magic#8f3a9c1e7b2d4f6a8c0b1e2d3f4a5b6c',
  'https://github.com/acme/widgets/blob/main/reset-password/8f3a9c1e7b2d4f6a',
  'http://localhost:3000/docs',
  'https://docs.google.com/document/d/abc123',
  'https://example.com/page?token=abc'
];

const publicUrls = [
  'https://github.com/facebook/react',
  'https://github.com/torvalds/linux/blob/master/README',
  'https://github.com/facebook/react/commit/a1b2c3d4e5f6789012345678901234567890abcd',
  'https://github.com/acme/8f3a9c1e7b2d4f6a8c0b1e2d3f4a5b6c',
  'https://github.com/reset-password/8f3a9c1e7b2d4f6a',
  'https://github.com/acme/reset-password',
  'https://github.com/features/copilot',
  'https://gitlab.com/gitlab-org/gitlab/-/commit/a1b2c3d4e5f6789012345678901234567890abcd',
  'https://docs.github.com/en/get-started',
  'https://developer.mozilla.org/en-US/docs/Web/API/URL',
  'https://react.dev/learn',
  'https://blog.cloudflare.com/announcing-our-network',
  'https://example.com/blog/how-to-reset-your-password',
  'https://example.com/docs/password-reset',
  'https://example.com/docs/confirm/changes',
  'https://example.com/reset-password',
  'https://example.com/reset-password/help',
  'https://example.com/password-reset/2024-guide',
  'https://example.com/share',
  'https://example.com/share/my-vacation-photos',
  'https://example.com/share/2024photos',
  'https://example.com/share/v1.2.3',
  'https://example.com/downloads/report',
  'https://example.com/j/1234567890',
  'https://example.com/assets/index-8f3a9c1e7b2d4f6a.js',
  'https://example.com/blog/using-uuids-550e8400-e29b-41d4-a716-446655440000',
  'https://medium.com/@jane/how-to-reset-your-password-1a2b3c4d5e6f',
  'https://example.com/docs/getting-started#installation',
  'https://example.com/blog/post?utm_source=newsletter',
  'https://arxiv.org/abs/2301.07041',
  'https://arxiv.org/pdf/2301.07041.pdf',
  'https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array',
  'https://en.wikipedia.org/wiki/URL',
  'https://en.wikipedia.org/wiki/Password_reset',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.bilibili.com/video/BV1xx411c7mD',
  'https://news.ycombinator.com/',
  'https://www.npmjs.com/package/react',
  'https://x.com/user/status/1234567890123456789',
  'https://gist.github.com/',
  'https://gist.github.com/octocat',
  'https://gist.github.com/discover',
  'https://t.me/durov',
  'https://t.me/durov/123',
  'https://discord.com/',
  'https://discord.com/developers/docs/intro',
  'https://discord.com/channels/123456789012345678/123456789012345678',
  'https://zoom.us/',
  'https://zoom.us/pricing',
  'https://support.zoom.us/hc/en-us',
  'https://wetransfer.com/',
  'https://wetransfer.com/explore',
  'https://chatgpt.com/',
  'https://chatgpt.com/g/g-pmuQf6v2p',
  'https://claude.ai/',
  'https://www.notion.so/product'
];

describe('private link classification', () => {
  it.each(localOnly)('%s stays on device', url => {
    expect(isLocalOnly({ url })).toBe(true);
    expect(detectAssetType(url)).toBe('private');
  });

  it.each(publicUrls)('%s stays public', url => {
    expect(isLocalOnly({ url })).toBe(false);
    expect(detectAssetType(url)).not.toBe('private');
  });

  it('keeps an explicitly private bookmark local even when the url is public', () => {
    expect(isLocalOnly({ url: 'https://github.com/facebook/react', isPrivate: true })).toBe(true);
  });
});
