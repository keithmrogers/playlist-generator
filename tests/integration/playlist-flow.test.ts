import { PlaylistService, Playlist, Track } from '../../src/services/playlist-service';
import { SpotifyService } from '../../src/services/spotify-service';
import SpotifyWebApi from 'spotify-web-api-node';
import * as path from 'path';
import * as fs from 'fs';
import { jest } from '@jest/globals';

// Create a temp directory for test playlists
const TEST_PLAYLISTS_DIR = path.join(__dirname, '../../temp-test-playlists');

// Mock environment variables
process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';

// Mock Spotify API
jest.mock('spotify-web-api-node');

describe('Playlist Integration Tests', () => {
  let playlistService: PlaylistService;
  let spotifyService: SpotifyService;
  let mockSearchTracks: jest.Mock;
  let mockClientCredentialsGrant: jest.Mock;
  
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
    // Clear mock data
    jest.clearAllMocks();
    
    // Setup Spotify mocks
    mockSearchTracks = jest.fn();
    mockClientCredentialsGrant = jest.fn();
    
    (SpotifyWebApi as unknown as jest.Mock).mockImplementation(() => ({
      clientCredentialsGrant: mockClientCredentialsGrant,
      setAccessToken: jest.fn(),
      searchTracks: mockSearchTracks
    }));
    
    // Create service instances
    playlistService = new PlaylistService(TEST_PLAYLISTS_DIR);
    spotifyService = new SpotifyService(
      process.env.SPOTIFY_CLIENT_ID!, 
      process.env.SPOTIFY_CLIENT_SECRET!
    );
  });
  
  test('Create and retrieve a playlist', async () => {
    // Mock spotify search response
    const mockTracks = [
      {
        name: 'Mock Song 1',
        artists: [{ name: 'Mock Artist 1' }],
        uri: 'spotify:track:mock1'
      },
      {
        name: 'Mock Song 2',
        artists: [{ name: 'Mock Artist 2' }],
        uri: 'spotify:track:mock2'
      }
    ];
    
    mockSearchTracks.mockReturnValueOnce({
      body: {
        tracks: {
          items: mockTracks
        }
      }
    });
    
    mockClientCredentialsGrant.mockReturnValueOnce({
      body: { 'access_token': 'mock-token' }
    });
    
    // 1. Authorize with Spotify
    await spotifyService.authorize();
    
    // 2. Search for tracks
    const searchResult = await spotifyService.searchTracks('test query');
    
    // 3. Create a playlist with the tracks
    const playlist: Playlist = {
      name: 'Integration Test Playlist',
      tracks: searchResult.tracks
    };
    
    // 4. Save the playlist
    const savedPath = await playlistService.savePlaylist(playlist);
    
    // 5. Get available playlists
    const playlists = await playlistService.getPlaylists();
    
    // 6. Load the playlist
    const loadedPlaylist = await playlistService.loadPlaylist(playlists[0]);
    
    // Assertions
    expect(playlists.length).toBe(1);
    expect(playlists[0]).toBe('Integration_Test_Playlist.json');
    expect(loadedPlaylist.name).toBe('Integration Test Playlist');
    expect(loadedPlaylist.tracks).toHaveLength(2);
    expect(loadedPlaylist.tracks[0].name).toBe('Mock Song 1');
    expect(loadedPlaylist.tracks[0].artists[0]).toBe('Mock Artist 1');
    expect(loadedPlaylist.tracks[1].name).toBe('Mock Song 2');
  });

  test('Handle empty search results gracefully', async () => {
    // Mock empty spotify search response
    mockSearchTracks.mockReturnValueOnce({
      body: {
        tracks: {
          items: []
        }
      }
    });
    
    mockClientCredentialsGrant.mockReturnValueOnce({
      body: { 'access_token': 'mock-token' }
    });
    
    // 1. Authorize with Spotify
    await spotifyService.authorize();
    
    // 2. Search for tracks with no results
    const searchResult = await spotifyService.searchTracks('no results query');
    
    // Assertions
    expect(searchResult.tracks).toEqual([]);
    
    // 3. Create an empty playlist
    const playlist: Playlist = {
      name: 'Empty Playlist',
      tracks: []
    };
    
    // 4. Save the empty playlist
    await playlistService.savePlaylist(playlist);
    
    // 5. Load the playlist
    const playlists = await playlistService.getPlaylists();
    const loadedPlaylist = await playlistService.loadPlaylist(playlists[0]);
    
    // Assertions for empty playlist
    expect(loadedPlaylist.name).toBe('Empty Playlist');
    expect(loadedPlaylist.tracks).toHaveLength(0);
  });
});
