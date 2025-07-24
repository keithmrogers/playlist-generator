import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
}

export class YouTubeService {
  async search(query: string): Promise<YouTubeVideo | null> {
    // Use yt-dlp to search and get video info
    const results = await youtubedl(query, {
      dumpSingleJson: true,
      defaultSearch: 'ytsearch1', // search YouTube and return first result
      quiet: true
    });
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
    const subprocces = youtubedl.exec(url, {
      output: '-',
      format: 'bestaudio[ext=webm]/bestaudio/best', // prefers best audio-only format
      quiet: true
    }, { stdio: ['ignore', 'pipe', 'ignore'] });
    if (!subprocces.stdout) {
      throw new Error('Failed to create audio stream');
    }
    return subprocces.stdout;
  }
}
