import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('YouTubeCache', () => {
  let tmpDir: string;
  let cacheFile: string;
  let YouTubeCache: any;

  beforeEach(async () => {
    jest.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-cache-test-'));
    cacheFile = path.join(tmpDir, 'youtube-cache.json');
    ({ YouTubeCache } = await import('../../src/services/youtube-cache.js'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null for a cache miss', async () => {
    const cache = new YouTubeCache(cacheFile);
    expect(await cache.get('some query')).toBeNull();
  });

  it('returns the stored video after set()', async () => {
    const cache = new YouTubeCache(cacheFile);
    const video = { id: 'abc123', title: 'Cool Track', url: 'https://www.youtube.com/watch?v=abc123' };
    await cache.set('cool track artist', video);
    expect(await cache.get('cool track artist')).toEqual(video);
  });

  it('persists across instances (survives restart)', async () => {
    const video = { id: 'xyz', title: 'Persisted', url: 'https://www.youtube.com/watch?v=xyz' };
    const cache1 = new YouTubeCache(cacheFile);
    await cache1.set('persistent query', video);

    const cache2 = new YouTubeCache(cacheFile);
    expect(await cache2.get('persistent query')).toEqual(video);
  });

  it('returns null when the cache file does not exist', async () => {
    const cache = new YouTubeCache(path.join(tmpDir, 'nonexistent.json'));
    expect(await cache.get('anything')).toBeNull();
  });

  it('overwrites an existing entry', async () => {
    const cache = new YouTubeCache(cacheFile);
    const v1 = { id: 'old', title: 'Old', url: 'https://www.youtube.com/watch?v=old' };
    const v2 = { id: 'new', title: 'New', url: 'https://www.youtube.com/watch?v=new' };
    await cache.set('same query', v1);
    await cache.set('same query', v2);
    expect(await cache.get('same query')).toEqual(v2);
  });
});
