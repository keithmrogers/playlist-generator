import { createAudioResource, demuxProbe, AudioPlayerStatus } from '@discordjs/voice';
import type { Response } from 'express';
import { DiscordService } from './services/discord-service.js';
import { YouTubeService } from './services/youtube-service.js';
import { YouTubeCache } from './services/youtube-cache.js';
import type { Playlist, Track } from './services/playlist-service.js';

export interface NowPlayingState {
  playlistName: string | null;
  track: Track | null;
  trackIndex: number;
  totalTracks: number;
  playerStatus: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export class PlaybackState {
  private discord: DiscordService;
  private yt: YouTubeService;
  private playlist: Playlist | null = null;
  private tracks: Track[] = [];
  private currentIndex = 0;
  private prevPlayerStatus: AudioPlayerStatus | undefined;
  private sseClients = new Set<Response>();
  private pollInterval: ReturnType<typeof setInterval>;
  private advancing = false;

  constructor(discord: DiscordService, cachePath?: string) {
    this.discord = discord;
    const cache = cachePath ? new YouTubeCache(cachePath) : undefined;
    this.yt = new YouTubeService(cache);
    this.pollInterval = setInterval(() => this.poll(), 200);
  }

  private poll(): void {
    const status = this.discord.getPlayerStatus();
    if (status === this.prevPlayerStatus) return;
    const wasPlaying = this.prevPlayerStatus === AudioPlayerStatus.Playing;
    const isIdle = status === AudioPlayerStatus.Idle;
    this.prevPlayerStatus = status;
    if (wasPlaying && isIdle && !this.advancing) {
      this.advance().catch(() => {});
    } else {
      this.broadcast();
    }
  }

  async load(playlist: Playlist): Promise<void> {
    // Reset state before stopping to avoid spurious Playing→Idle detection
    this.prevPlayerStatus = undefined;
    this.advancing = false;
    this.discord.stop();
    this.yt.cancelStream();

    this.playlist = playlist;
    this.tracks = shuffle(playlist.tracks);
    this.currentIndex = 0;
    this.broadcast();
    this.playCurrentTrack().catch(() => {});
  }

  async advance(): Promise<void> {
    if (!this.tracks.length) return;
    this.advancing = true;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    await this.playCurrentTrack();
    this.advancing = false;
  }

  private async playCurrentTrack(): Promise<void> {
    if (!this.tracks.length) return;
    const track = this.tracks[this.currentIndex]!;
    const query = `${track.name} ${track.artists.join(' ')}`;
    this.broadcast();
    try {
      const video = await this.yt.search(query);
      if (!video) throw new Error(`No YouTube result for: ${query}`);
      const stream = await this.yt.getAudioStream(video.url);
      const { stream: probed, type } = await demuxProbe(stream);
      const resource = createAudioResource(probed, { inputType: type, metadata: { title: video.title, id: video.id } });
      this.discord.playNow(resource);
    } catch {
    }
  }

  resetDiscordPlayback(): void {
    this.prevPlayerStatus = undefined;
    this.advancing = true;   // block poll-loop advance while tearing down
    this.playlist = null;
    this.tracks = [];
    this.advancing = false;
    this.broadcast();
  }

  async loadLocalMode(playlist: Playlist): Promise<void> {
    this.playlist = playlist;
    this.tracks = shuffle(playlist.tracks);
    this.currentIndex = 0;
    this.broadcast();
  }

  skipLocalMode(): void {
    if (!this.tracks.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    this.broadcast();
  }

  pause(): void {
    if (!this.playlist) throw new Error('No active playlist');
    this.discord.pause();
  }

  resume(): void {
    if (!this.playlist) throw new Error('No active playlist');
    this.discord.resume();
  }

  skip(): Promise<void> {
    if (!this.playlist) throw new Error('No active playlist');
    return this.advance();
  }

  isActive(): boolean {
    return this.playlist !== null;
  }

  getState(): NowPlayingState {
    return {
      playlistName: this.playlist?.name ?? null,
      track: this.tracks[this.currentIndex] ?? null,
      trackIndex: this.currentIndex,
      totalTracks: this.tracks.length,
      playerStatus: this.discord.getPlayerStatus() ?? 'idle',
    };
  }

  addSSEClient(res: Response): void {
    this.sseClients.add(res);
    res.write(`data: ${JSON.stringify(this.getState())}\n\n`);
  }

  removeSSEClient(res: Response): void {
    this.sseClients.delete(res);
  }

  private broadcast(): void {
    const data = JSON.stringify(this.getState());
    for (const client of this.sseClients) {
      client.write(`data: ${data}\n\n`);
    }
  }

  destroy(): void {
    clearInterval(this.pollInterval);
    this.discord.stop();
    this.yt.destroy();
  }
}
