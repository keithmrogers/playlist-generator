// @ts-nocheck
import { SpotifyService } from '../../src/services/spotify-service';
import SpotifyWebApi from 'spotify-web-api-node';
import { jest } from '@jest/globals';

jest.mock('spotify-web-api-node');

describe('SpotifyService Health Check', () => {
  let spotifyService: SpotifyService;
  let mockGrant: jest.Mock;
  let mockSetAccessToken: jest.Mock;
  let mockSearchTracks: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrant = jest.fn().mockResolvedValue({ body: { access_token: 'test-token' } });
    mockSetAccessToken = jest.fn();
    mockSearchTracks = jest.fn().mockResolvedValue({ body: { tracks: { items: [] } } });

    (SpotifyWebApi as unknown as jest.Mock).mockImplementation(() => ({
      clientCredentialsGrant: mockGrant,
      setAccessToken: mockSetAccessToken,
      searchTracks: mockSearchTracks
    }));

    spotifyService = new SpotifyService('id', 'secret');
  });

  it('should authorize successfully', async () => {
    await expect(spotifyService.authorize()).resolves.not.toThrow();
    expect(mockGrant).toHaveBeenCalled();
    expect(mockSetAccessToken).toHaveBeenCalledWith('test-token');
  });

  it('should return empty tracks on search', async () => {
    await spotifyService.authorize();
    const result = await spotifyService.searchTracks('query');
    expect(mockSearchTracks).toHaveBeenCalledWith('query', { limit: 5 });
    expect(result.tracks).toEqual([]);
  });
});
