import { jest } from '@jest/globals';
import { join } from 'path';

const mockFs = {
  writeFile: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
};

jest.unstable_mockModule('fs', () => ({
  promises: mockFs,
}));

const mockPlaylistsDir = '/mock/playlists';

const testPlaylist = {
  name: 'Test Playlist',
  tracks: [
    { name: 'Song 1', artists: ['Artist 1'], uri: 'spotify:track:1' },
    { name: 'Song 2', artists: ['Artist 2'], uri: 'spotify:track:2' },
  ],
};

describe('PlaylistService', () => {
  let playlistService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { PlaylistService } = await import('../../src/services/playlist-service.js');
    playlistService = new PlaylistService(mockPlaylistsDir);
  });

  describe('savePlaylist', () => {
    it('saves a playlist to a JSON file', async () => {
      mockFs.mkdir.mockResolvedValue(undefined as never);
      mockFs.writeFile.mockResolvedValue(undefined as never);

      const filePath = await playlistService.savePlaylist(testPlaylist);

      const expectedPath = join(mockPlaylistsDir, 'Test_Playlist.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(expectedPath, JSON.stringify(testPlaylist, null, 2));
      expect(filePath).toBe(expectedPath);
    });

    it('sanitizes playlist name for filename', async () => {
      mockFs.mkdir.mockResolvedValue(undefined as never);
      mockFs.writeFile.mockResolvedValue(undefined as never);

      const specialPlaylist = { name: 'Test/Playlist\\With/Special\\Chars', tracks: [] };
      await playlistService.savePlaylist(specialPlaylist);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        join(mockPlaylistsDir, 'Test_Playlist_With_Special_Chars.json'),
        expect.any(String)
      );
    });
  });

  describe('getPlaylists', () => {
    it('returns .json filenames from the directory', async () => {
      mockFs.readdir.mockResolvedValue(['playlist1.json', 'playlist2.json', 'notaplaylist.txt'] as never);

      const playlists = await playlistService.getPlaylists();

      expect(mockFs.readdir).toHaveBeenCalledWith(mockPlaylistsDir);
      expect(playlists).toEqual(['playlist1.json', 'playlist2.json']);
    });

    it('creates the directory and returns empty on ENOENT', async () => {
      const error = Object.assign(new Error('Not found'), { code: 'ENOENT' });
      mockFs.readdir.mockRejectedValue(error as never);
      mockFs.mkdir.mockResolvedValue(undefined as never);

      const playlists = await playlistService.getPlaylists();

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockPlaylistsDir, { recursive: true });
      expect(playlists).toEqual([]);
    });
  });

  describe('loadPlaylist', () => {
    it('loads and parses a playlist from a file', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(testPlaylist) as never);

      const playlist = await playlistService.loadPlaylist('test-playlist.json');

      expect(mockFs.readFile).toHaveBeenCalledWith(join(mockPlaylistsDir, 'test-playlist.json'), 'utf-8');
      expect(playlist).toEqual(testPlaylist);
    });
  });
});
