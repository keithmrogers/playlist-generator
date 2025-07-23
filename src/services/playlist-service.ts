import { promises as fs } from 'fs';
import path from 'path';

export interface Track {
  name: string;
  artists: string[];
  uri: string;
}

export interface Playlist {
  name: string;
  tracks: Track[];
}

export class PlaylistService {
  private playlistsDir: string;

  constructor(playlistsDir: string) {
    this.playlistsDir = playlistsDir;
  }

  async savePlaylist(playlist: Playlist): Promise<string> {
    const safeFileName = `${playlist.name.replace(/[\\/]/g, '_')}.json`;
    const filePath = path.join(this.playlistsDir, safeFileName);
    
    await fs.writeFile(filePath, JSON.stringify(playlist, null, 2));
    return filePath;
  }

  async getPlaylists(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.playlistsDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(this.playlistsDir, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  async loadPlaylist(fileName: string): Promise<Playlist> {
    const filePath = path.join(this.playlistsDir, fileName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Playlist;
  }
}
