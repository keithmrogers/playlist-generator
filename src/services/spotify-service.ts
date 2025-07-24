import SpotifyWebApi from 'spotify-web-api-node';
import { Track } from './playlist-service.js';

export interface SpotifyTrackSearchResult {
  tracks: Track[];
}

export class SpotifyService {
  private api: SpotifyWebApi;
  
  constructor(clientId: string, clientSecret: string) {
    this.api = new SpotifyWebApi({ clientId, clientSecret });
  }
  
  async authorize(): Promise<void> {
    const data = await this.api.clientCredentialsGrant();
    this.api.setAccessToken(data.body['access_token']);
  }
  
  async searchTracks(query: string, limit: number = 5): Promise<SpotifyTrackSearchResult> {
    const result = await this.api.searchTracks(query, { limit });
    
    if (!result.body.tracks?.items.length) {
      return { tracks: [] };
    }
    
    const tracks = result.body.tracks?.items.map(item => ({
      name: item.name,
      artists: item.artists.map(artist => artist.name),
      uri: item.uri
    }));
    
    return { tracks };
  }
}
