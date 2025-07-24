import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
}

export class YouTubeService {
  /** Ensure yt-dlp binary is installed and on PATH */
  async healthCheck(): Promise<void> {
    try {
      await youtubedl.exec('--version', { quiet: true });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(
          'yt-dlp binary not found. Please install yt-dlp (e.g., pip install yt-dlp) or ensure it is on your PATH'
        );
      }
      throw err;
    }
  }

  async search(query: string): Promise<YouTubeVideo | null> {
    // Pre-flight check
    await this.healthCheck();
    // Use yt-dlp to search and get video info
    let results: any;
    try {
      results = await youtubedl.exec(query, {
        dumpSingleJson: true,
        defaultSearch: 'ytsearch1', // search YouTube and return first result
        quiet: true
      });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error('Failed to spawn yt-dlp for search. Please ensure yt-dlp is installed and accessible');
      }
      throw err;
    }
    const parsedResults = typeof results === 'string' ? JSON.parse(results) : results;
    if (!parsedResults || !parsedResults.entries || !parsedResults.entries.length) return null;
    const video = parsedResults.entries[0];
    return {
      id: video.id ?? '',
      title: video.title ?? '',
      url: video.webpage_url ?? ''
    };
  }

  async getAudioStream(url: string): Promise<Readable> {
    // Use yt-dlp to select best audio-only format and return a readable stream
    let subprocces: any;
    try {
      subprocces = youtubedl.exec(url, {
        output: '-',
        format: 'bestaudio[ext=webm]/bestaudio/best', // prefers best audio-only format
        quiet: true
      }, { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error('yt-dlp binary not found. Please install yt-dlp (e.g., pip install yt-dlp) or ensure it is on your PATH');
      }
      throw err;
    }
    if (!subprocces.stdout) {
      throw new Error('Failed to create audio stream');
    }
    return subprocces.stdout;
  }
}
