import { promises as fs } from 'fs';
import type { YouTubeVideo } from './youtube-service.js';

interface CacheEntry {
  url: string;
  title: string;
  id: string;
}

interface CacheData {
  [query: string]: CacheEntry;
}

export class YouTubeCache {
  private filePath: string;
  private data: CacheData = {};
  private loaded = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw) as CacheData;
    } catch {
      this.data = {};
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async get(query: string): Promise<YouTubeVideo | null> {
    await this.load();
    const entry = this.data[query];
    if (!entry) return null;
    return { id: entry.id, title: entry.title, url: entry.url };
  }

  async set(query: string, video: YouTubeVideo): Promise<void> {
    await this.load();
    this.data[query] = { url: video.url, title: video.title, id: video.id };
    await this.persist();
  }
}
