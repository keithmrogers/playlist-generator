import { PlaylistService } from '../../src/services/playlist-service';
import * as path from 'path';
import * as fs from 'fs';

// Create a temp directory for test playlists
const TEST_PLAYLISTS_DIR = path.join(__dirname, '../../temp-test-playlists');

describe('Playlist Service Integration Tests', () => {
  let playlistService: PlaylistService;
  
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_PLAYLISTS_DIR)) {
      fs.mkdirSync(TEST_PLAYLISTS_DIR, { recursive: true });
    }
  });
  
  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_PLAYLISTS_DIR)) {
      fs.rmSync(TEST_PLAYLISTS_DIR, { recursive: true, force: true });
    }
  });
  
  beforeEach(() => {
    // Clear any existing test playlists
    const files = fs.readdirSync(TEST_PLAYLISTS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEST_PLAYLISTS_DIR, file));
    }
    
    // Create service instance
    playlistService = new PlaylistService(TEST_PLAYLISTS_DIR);
  });
  
  test('Creates and retrieves a playlist with filesystem persistence', async () => {
    // Create a test playlist
    const testPlaylist = {
      name: 'Real Filesystem Test',
      tracks: [
        { name: 'Test Track 1', artists: ['Test Artist 1'], uri: 'spotify:track:test1' },
        { name: 'Test Track 2', artists: ['Test Artist 2'], uri: 'spotify:track:test2' }
      ]
    };
    
    // Save the playlist
    const savedPath = await playlistService.savePlaylist(testPlaylist);
    
    // Verify the file exists
    expect(fs.existsSync(savedPath)).toBe(true);
    
    // Get playlists and check
    const playlists = await playlistService.getPlaylists();
    expect(playlists).toContain('Real_Filesystem_Test.json');
    
    // Load the playlist
    const loadedPlaylist = await playlistService.loadPlaylist('Real_Filesystem_Test.json');
    
    // Verify contents
    expect(loadedPlaylist).toEqual(testPlaylist);
  });

  test('Handles multiple playlists', async () => {
    // Create multiple test playlists
    const playlist1 = {
      name: 'Playlist One',
      tracks: [{ name: 'Track 1', artists: ['Artist 1'], uri: 'spotify:track:1' }]
    };
    
    const playlist2 = {
      name: 'Playlist Two',
      tracks: [{ name: 'Track 2', artists: ['Artist 2'], uri: 'spotify:track:2' }]
    };
    
    // Save both playlists
    await playlistService.savePlaylist(playlist1);
    await playlistService.savePlaylist(playlist2);
    
    // Get playlists and check
    const playlists = await playlistService.getPlaylists();
    expect(playlists.length).toBe(2);
    expect(playlists).toContain('Playlist_One.json');
    expect(playlists).toContain('Playlist_Two.json');
    
    // Load both playlists
    const loadedPlaylist1 = await playlistService.loadPlaylist('Playlist_One.json');
    const loadedPlaylist2 = await playlistService.loadPlaylist('Playlist_Two.json');
    
    // Verify contents
    expect(loadedPlaylist1).toEqual(playlist1);
    expect(loadedPlaylist2).toEqual(playlist2);
  });
  
  test('Creates playlists directory if it does not exist', async () => {
    // Remove the directory
    fs.rmSync(TEST_PLAYLISTS_DIR, { recursive: true, force: true });
    expect(fs.existsSync(TEST_PLAYLISTS_DIR)).toBe(false);
    
    // Try to get playlists - should create directory
    const playlists = await playlistService.getPlaylists();
    
    // Check that directory was created
    expect(fs.existsSync(TEST_PLAYLISTS_DIR)).toBe(true);
    expect(playlists).toEqual([]);
  });
});
