import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';
import { createWriteStream } from 'fs';

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
    console.log(`[YouTubeService] Searching YouTube for: "${query}"`);
    let results: any;
    try {
        results = await youtubedl.exec(query, {
        dumpSingleJson: true,
        defaultSearch: 'ytsearch1',
        quiet: true,
        
      });
    } catch (err: any) {
      console.error(`[YouTubeService] yt-dlp search error:`, err);
      if (err.code === 'ENOENT') {
        throw new Error('Failed to spawn yt-dlp for search. Please ensure yt-dlp is installed and accessible');
      }
      throw err;
    }
    const parsedResults = JSON.parse(results.stdout);
    if (!parsedResults || !parsedResults.entries || !parsedResults.entries.length) {
      console.warn(`[YouTubeService] No search results found for: "${query}"`);
      return null;
    }
    const video = parsedResults.entries[0];
    console.log(`[YouTubeService] Found video: ${video.title} (${video.id})`);
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
      // Stream the full best audio track (no ext filter to avoid segment cutoffs)
      subprocces = youtubedl.exec(url, {
        output: '-',
        format: 'bestaudio/best', // full audio-only best format
        quiet: true,
        noPlaylist: true,       // ensure full video, not playlist
        hlsPreferNative: true,   // use native HLS handling to avoid segment cutoff
        hlsUseMpegts: true       // stream in MPEG-TS to keep continuous audio
 }, { stdio: ['ignore', 'pipe', 'pipe'] });
      // Debug logging for the yt-dlp process and stream data
      console.log(`[YouTubeService] yt-dlp started (pid=${subprocces.pid})`);
      // DEBUG: pipe full stdout to file for download verification
      const debugFile = createWriteStream('yt_debug_audio.raw');
      subprocces.stdout.pipe(debugFile);
      debugFile.on('finish', () => {
        console.log('[YouTubeService] DEBUG: full audio download saved to yt_debug_audio.raw');
      });
      subprocces.stderr?.on('data', (chunk: Buffer) => {
        console.error(`[YouTubeService] yt-dlp stderr: ${chunk.toString()}`);
      });
      if (subprocces.stdout) {
        subprocces.stdout.on('data', (chunk: Buffer) => {
          console.log(`[YouTubeService] yt-dlp stdout chunk: ${chunk.length} bytes`);
        });
      }
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
