import { SpotifyService } from '../src/services/spotify-service';
import SpotifyWebApi from 'spotify-web-api-node';
import { jest } from '@jest/globals';

// Mock spotify-web-api-node
jest.mock('spotify-web-api-node');

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;
  let mockClientCredentialsGrant: jest.Mock;
  let mockSetAccessToken: jest.Mock;
  let mockSearchTracks: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock functions
    mockClientCredentialsGrant = jest.fn();
    mockSetAccessToken = jest.fn();
    mockSearchTracks = jest.fn();
    
    // Setup constructor mock
    (SpotifyWebApi as unknown as jest.Mock).mockImplementation(() => ({
      clientCredentialsGrant: mockClientCredentialsGrant,
      setAccessToken: mockSetAccessToken,
      searchTracks: mockSearchTracks
    }));
    
    spotifyService = new SpotifyService('test-client-id', 'test-client-secret');
  });
  
  describe('authorize', () => {
    it('should obtain an access token and set it', async () => {
      const mockToken = 'mock-access-token';
      const mockResponse = { body: { 'access_token': mockToken } };
      
      mockClientCredentialsGrant.mockReturnValueOnce(mockResponse);
      
      await spotifyService.authorize();
      
      expect(mockClientCredentialsGrant).toHaveBeenCalled();
      expect(mockSetAccessToken).toHaveBeenCalledWith(mockToken);
    });
  });
  
  describe('searchTracks', () => {
    it('should return tracks from search results', async () => {
      const mockTrackItems = [
        {
          name: 'Test Track 1',
          artists: [{ name: 'Test Artist 1' }],
          uri: 'spotify:track:1'
        },
        {
          name: 'Test Track 2',
          artists: [{ name: 'Test Artist 2A' }, { name: 'Test Artist 2B' }],
          uri: 'spotify:track:2'
        }
      ];
      
      const mockSearchResult = {
        body: {
          tracks: {
            items: mockTrackItems
          }
        }
      };
      
      mockSearchTracks.mockReturnValueOnce(mockSearchResult);
      
      const result = await spotifyService.searchTracks('test query');
      
      expect(mockSearchTracks).toHaveBeenCalledWith('test query', { limit: 5 });
      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0].name).toBe('Test Track 1');
      expect(result.tracks[0].artists).toEqual(['Test Artist 1']);
      expect(result.tracks[1].artists).toEqual(['Test Artist 2A', 'Test Artist 2B']);
    });
    
    it('should return empty tracks array when no results found', async () => {
      const mockSearchResult = {
        body: {
          tracks: {
            items: []
          }
        }
      };
      
      mockSearchTracks.mockReturnValueOnce(mockSearchResult);
      
      const result = await spotifyService.searchTracks('no results query');
      
      expect(result.tracks).toEqual([]);
    });
    
    it('should handle undefined tracks in response', async () => {
      const mockSearchResult = {
        body: {
          tracks: undefined
        }
      };
      
      mockSearchTracks.mockReturnValueOnce(mockSearchResult);
      
      const result = await spotifyService.searchTracks('bad query');
      
      expect(result.tracks).toEqual([]);
    });
  });
});
