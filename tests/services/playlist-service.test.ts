import { PlaylistService, Playlist, Track } from '../../src/services/playlist-service';
import { jest } from '@jest/globals';

// Mock fs/promises and path modules
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('PlaylistService', () => {
  let playlistService: PlaylistService;
  let path: any;
  const mockPlaylistsDir = (() => {
    path = require('path');
    return path.join(__dirname, '../temp-test-playlists');
  })();
  
  // Sample test data
  const testPlaylist: Playlist = {
    name: 'Test Playlist',
    tracks: [
      { name: 'Song 1', artists: ['Artist 1'], uri: 'spotify:track:1' },
      { name: 'Song 2', artists: ['Artist 2'], uri: 'spotify:track:2' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    playlistService = new PlaylistService(mockPlaylistsDir);
  });

  describe('savePlaylist', () => {
    it('should save a playlist to a file', async () => {
      const fsPromises = require('fs/promises');
      fsPromises.writeFile.mockResolvedValue(undefined);

      const filePath = await playlistService.savePlaylist(testPlaylist);
      
      expect(path.join).toHaveBeenCalledWith(mockPlaylistsDir, 'Test_Playlist.json');
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        `${mockPlaylistsDir}/Test_Playlist.json`,
        JSON.stringify(testPlaylist, null, 2)
      );
      expect(filePath).toBe(`${mockPlaylistsDir}/Test_Playlist.json`);
    });

    it('should handle playlist names with special characters', async () => {
      const fsPromises = require('fs/promises');
      fsPromises.writeFile.mockResolvedValue(undefined);
      
      const specialPlaylist: Playlist = {
        name: 'Test/Playlist\\With/Special\\Chars',
        tracks: []
      };

      await playlistService.savePlaylist(specialPlaylist);
      
      expect(path.join).toHaveBeenCalledWith(
        mockPlaylistsDir, 
        'Test_Playlist_With_Special_Chars.json'
      );
    });
  });

  describe('getPlaylists', () => {
    it('should return a list of playlist files', async () => {
      const fsPromises = require('fs/promises');
      fsPromises.readdir.mockResolvedValue(['playlist1.json', 'playlist2.json', 'notaplaylist.txt']);
      
      const playlists = await playlistService.getPlaylists();
      
      expect(fsPromises.readdir).toHaveBeenCalledWith(mockPlaylistsDir);
      expect(playlists).toEqual(['playlist1.json', 'playlist2.json']);
    });

    it('should create the directory if it does not exist', async () => {
      const fsPromises = require('fs/promises');
      const error = new Error('Directory not found');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      
      fsPromises.readdir.mockRejectedValue(error);
      fsPromises.mkdir.mockResolvedValue(undefined);
      
      const playlists = await playlistService.getPlaylists();
      
      expect(fsPromises.mkdir).toHaveBeenCalledWith(mockPlaylistsDir, { recursive: true });
      expect(playlists).toEqual([]);
    });
  });

  describe('loadPlaylist', () => {
    it('should load a playlist from a file', async () => {
      const fsPromises = require('fs/promises');
      fsPromises.readFile.mockResolvedValue(JSON.stringify(testPlaylist));
      
      const playlist = await playlistService.loadPlaylist('test-playlist.json');
      
      expect(path.join).toHaveBeenCalledWith(mockPlaylistsDir, 'test-playlist.json');
      expect(fsPromises.readFile).toHaveBeenCalledWith(`${mockPlaylistsDir}/test-playlist.json`, 'utf-8');
      expect(playlist).toEqual(testPlaylist);
    });
  });
});
