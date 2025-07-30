import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
}

export class YouTubeService {
  private currentProcess?: ChildProcess;
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
    return {
      id: video.id ?? '',
      title: video.title ?? '',
      url: video.webpage_url ?? ''
    };
  }

  async getAudioStream(url: string): Promise<Readable> {
    // Spawn yt-dlp directly for continuous audio streaming
    const args = [
      url,
      '-o', '-',
      '-f', 'bestaudio/best',
      '--quiet',
      '--no-playlist',
      '--hls-prefer-native',
      '--hls-use-mpegts'
    ];
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.currentProcess = proc;
    // Suppress errors on subprocess and its stderr
    proc.on('error', () => {});
    proc.stderr.on('error', () => {});
    proc.on('close', () => { this.currentProcess = undefined; });
    const stream = proc.stdout;
    if (!stream) {
      throw new Error('Failed to create audio stream');
    }
    // Suppress stream errors (e.g., broken pipe) after cancellation
    stream.on('error', () => {});
    return stream;
  }

  /** Cancel any in-flight yt-dlp audio stream */
  public cancelStream(): void {
    if (this.currentProcess) {
      const proc = this.currentProcess;
      // first try to interrupt gracefully
      proc.kill('SIGINT');
      // if still running, try termination
      setTimeout(() => { if (!proc.killed) proc.kill('SIGTERM'); }, 100);
      // if still running after timeout, force kill
      setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); }, 500);
      this.currentProcess = undefined;
    }
  }
  /** Cleanup the YouTubeService, cancelling any active process */
  public destroy(): void {
    this.cancelStream();
  }
}
