import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '../types/domain';
import { githubApiOriginsFor } from './adapters/githubAdapter';
import { modelHostPermissionOrigin, requestModelHostAccess } from './modelConfig';

function settings(partial: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, allowRemoteEnrichment: true, apiKey: 'test-key', modelName: 'test-model', ...partial };
}

function mockRequest(granted = true): string[][] {
  const requested: string[][] = [];
  (globalThis as { chrome?: unknown }).chrome = {
    permissions: {
      request: async ({ origins }: { origins: string[] }) => {
        requested.push(origins);
        return granted;
      }
    }
  };
  return requested;
}

afterEach(() => {
  delete (globalThis as { chrome?: unknown }).chrome;
});

describe('model host permissions', () => {
  it('builds a host pattern without the port or path', () => {
    expect(modelHostPermissionOrigin(new URL('https://api.deepseek.com/v1/chat/completions'))).toBe('https://api.deepseek.com/*');
    expect(modelHostPermissionOrigin(new URL('http://127.0.0.1:11434/v1'))).toBe('http://127.0.0.1/*');
    expect(modelHostPermissionOrigin(new URL('http://localhost:1234/v1'))).toBe('http://localhost/*');
  });

  it('requests preset model hosts and loopback instead of assuming they are already granted', async () => {
    const requested = mockRequest();
    await requestModelHostAccess(settings({ modelProvider: 'custom', baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' }));
    await requestModelHostAccess(settings({ modelProvider: 'custom', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4-flash' }));
    await requestModelHostAccess(settings({ modelProvider: 'jev', baseUrl: 'https://api.typesafe.ai/v1', modelName: 'jev-1.13.0' }));
    await requestModelHostAccess(settings({ modelProvider: 'custom', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' }));
    await requestModelHostAccess(settings({ modelProvider: 'custom', baseUrl: 'http://127.0.0.1:11434/v1', modelName: 'llama' }));
    await requestModelHostAccess(settings({ modelProvider: 'custom', baseUrl: 'http://localhost:1234/v1', modelName: 'local' }));
    await requestModelHostAccess(settings({ modelProvider: 'laya_local', baseUrl: 'http://127.0.0.1:8000/v1', modelName: 'laya-421m' }));
    expect(requested).toEqual([
      ['https://api.deepseek.com/*'],
      ['https://open.bigmodel.cn/*'],
      ['https://api.typesafe.ai/*'],
      ['https://api.openai.com/*'],
      ['http://127.0.0.1/*'],
      ['http://localhost/*'],
      ['http://127.0.0.1/*']
    ]);
  });

  it('does not request a host when remote analysis is off', async () => {
    const requested = mockRequest();
    await requestModelHostAccess(settings({ allowRemoteEnrichment: false, baseUrl: 'https://api.deepseek.com/v1' }));
    expect(requested).toEqual([]);
  });

  it('refuses to save when the host permission is denied', async () => {
    mockRequest(false);
    await expect(requestModelHostAccess(settings({ baseUrl: 'https://api.openai.com/v1' }))).rejects.toThrow();
  });
});

describe('GitHub API origins', () => {
  it('requests GitHub hosts only for repositories that will be fetched', () => {
    expect(githubApiOriginsFor([{ url: 'https://github.com/facebook/react', assetType: 'repo' }])).toEqual([
      'https://api.github.com/*',
      'https://raw.githubusercontent.com/*'
    ]);
    expect(githubApiOriginsFor([{ url: 'https://github.com/topics/typescript', assetType: 'other' }])).toEqual([]);
    expect(githubApiOriginsFor([{ url: 'https://example.com/post', assetType: 'repo' }])).toEqual([]);
  });
});
