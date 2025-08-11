import SpotifyWebApi from 'spotify-web-api-node';
import { Track, Playlist } from './playlist-service.js';
import { OAuthCallbackService } from './oauth-callback-service.js';

export interface SpotifyTrackSearchResult {
  tracks: Track[];
}

export class SpotifyService {
  private api: SpotifyWebApi;

  constructor(clientId: string, clientSecret: string) {
    this.api = new SpotifyWebApi({ clientId, clientSecret });
  }

  async authorize(): Promise<void> {
    console.log('SpotifyService: authorizing client credentials');
    const data = await this.api.clientCredentialsGrant();
    console.log('SpotifyService: received access token');
    this.api.setAccessToken(data.body['access_token']);
  }

  async searchTracks(query: string, limit: number = 5, popularityThreshold: number = 30): Promise<SpotifyTrackSearchResult> {
    console.log(`SpotifyService: searching tracks for query: "${query}", limit: ${limit}`);
    const result = await this.api.searchTracks(query, { limit });

    if (!result.body.tracks?.items.length) {
      console.log('SpotifyService: no tracks found');
      return { tracks: [] };
    }

    // map raw items to tracks including popularity
    const mapped = result.body.tracks?.items.map(item => ({
      name: item.name,
      artists: item.artists.map(artist => artist.name),
      uri: item.uri,
      popularity: item.popularity
    }));
    // filter by popularity threshold
    const tracks = mapped.filter(t => (t.popularity ?? 0) >= popularityThreshold);
    if (!tracks.length) {
      console.log(`SpotifyService: no tracks above popularity threshold ${popularityThreshold}`);
      return { tracks: [] };
    }
    console.log(`SpotifyService: found ${tracks.length} track(s) above popularity >= ${popularityThreshold}`);

    return { tracks };
  }

  /**
   * Upload a playlist to Spotify
   * Note: This requires user authorization, not just client credentials.
   * The service needs to be configured with user access tokens to create playlists.
   */
  async uploadPlaylist(playlist: Playlist, userId: string, description?: string): Promise<string> {
    console.log(`SpotifyService: creating playlist "${playlist.name}" for user ${userId}`);
    
    try {
      // Create the playlist - using proper method signature for spotify-web-api-node v5
      const createResult = await this.api.createPlaylist(userId, {
        name: playlist.name,
        description: description || `Generated playlist with tags: ${playlist.tags?.join(', ') || 'none'}`,
        public: false
      } as any);
      
      const playlistId = (createResult as any).body.id;
      console.log(`SpotifyService: created playlist with ID ${playlistId}`);
      
      // Add tracks to the playlist in batches (Spotify API limit is 100 tracks per request)
      const trackUris = playlist.tracks
        .map(track => track.uri)
        .filter((uri): uri is string => uri !== undefined && uri.startsWith('spotify:track:'));
      
      if (trackUris.length === 0) {
        console.log('SpotifyService: no valid Spotify URIs found in playlist');
        return playlistId;
      }
      
      const batchSize = 100;
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        await this.api.addTracksToPlaylist(playlistId, batch);
        console.log(`SpotifyService: added ${batch.length} tracks to playlist (batch ${Math.floor(i/batchSize) + 1})`);
      }
      
      console.log(`SpotifyService: successfully uploaded playlist with ${trackUris.length} tracks`);
      return playlistId;
    } catch (error) {
      console.error('SpotifyService: error creating playlist:', error);
      throw new Error(`Failed to upload playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get authorization URL for user authentication
   * This starts the OAuth flow to get user permissions for playlist creation
   */
  getAuthorizationUrl(redirectUri: string, scopes: string[] = ['playlist-modify-public', 'playlist-modify-private']): string {
    this.api.setRedirectURI(redirectUri);
    const authorizeURL = this.api.createAuthorizeURL(scopes, 'playlist-generator-state');
    console.log(`SpotifyService: authorization URL created for scopes: ${scopes.join(', ')}`);
    return authorizeURL;
  }

  /**
   * Get authorization URL for CLI apps with automatic local server setup
   * This is a convenience method for Node.js CLI applications
   */
  getAuthorizationUrlForCLI(port: number = 8888, scopes: string[] = ['playlist-modify-public', 'playlist-modify-private']): string {
    const redirectUri = `http://localhost:${port}/callback`;
    return this.getAuthorizationUrl(redirectUri, scopes);
  }

  /**
   * Exchange authorization code for access token
   * Call this after user authorizes your app and you receive the callback with the code
   */
  async getAccessTokenFromCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    console.log('SpotifyService: exchanging authorization code for access token');
    try {
      const data = await this.api.authorizationCodeGrant(code);
      const { access_token, refresh_token, expires_in } = data.body;
      
      // Set the access token on the API instance
      this.api.setAccessToken(access_token);
      this.api.setRefreshToken(refresh_token);
      
      console.log('SpotifyService: successfully obtained user access token');
      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in
      };
    } catch (error) {
      console.error('SpotifyService: error exchanging code for token:', error);
      throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh an expired access token using the refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    console.log('SpotifyService: refreshing access token');
    try {
      this.api.setRefreshToken(refreshToken);
      const data = await this.api.refreshAccessToken();
      const { access_token, expires_in } = data.body;
      
      // Set the new access token
      this.api.setAccessToken(access_token);
      
      console.log('SpotifyService: successfully refreshed access token');
      return {
        accessToken: access_token,
        expiresIn: expires_in
      };
    } catch (error) {
      console.error('SpotifyService: error refreshing token:', error);
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set user access token for operations that require user authorization (like creating playlists)
   */
  setUserAccessToken(accessToken: string): void {
    this.api.setAccessToken(accessToken);
  }

  /**
   * Set refresh token for token refresh operations
   */
  setRefreshToken(refreshToken: string): void {
    this.api.setRefreshToken(refreshToken);
  }

  /**
   * Start a temporary local server to handle OAuth callback
   * Returns a promise that resolves with the authorization code
   * @deprecated Use OAuthCallbackService.startCallbackServer() directly
   */
  startCallbackServer(port: number = 8888): Promise<string> {
    return OAuthCallbackService.startCallbackServer(port).then(result => {
      if (result.error) {
        throw new Error(`Spotify authorization error: ${result.error}`);
      }
      if (!result.code) {
        throw new Error('No authorization code received');
      }
      return result.code;
    });
  }

  /**
   * Complete CLI authentication flow
   * This method handles the entire OAuth flow for CLI applications
   */
  async authenticateForCLI(port: number = 8888): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    console.log('SpotifyService: Starting CLI authentication flow...');
    
    try {
      // Get the authorization URL
      const authUrl = this.getAuthorizationUrlForCLI(port);
      
      // Use OAuthCallbackService to handle the complete flow
      const result = await OAuthCallbackService.completeOAuthFlow(authUrl, port);
      
      if (!result.code) {
        throw new Error('No authorization code received from OAuth flow');
      }
      
      console.log('SpotifyService: Authorization code received, exchanging for tokens...');
      
      // Exchange the code for tokens
      const tokens = await this.getAccessTokenFromCode(result.code);
      
      console.log('SpotifyService: Authentication successful!');
      return tokens;
      
    } catch (error) {
      console.error('SpotifyService: Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Clean a playlist by removing duplicates, invalid URIs, and unavailable tracks
   */
  async scrubPlaylist(playlist: Playlist, maxTracks?: number): Promise<Playlist> {
    await this.authorize();
    const seen = new Set<string>();
    const cleaned: Track[] = [];
    for (const t of playlist.tracks) {
      let uri = t.uri;
      // if no valid URI, search Spotify by name+artists
      if (!uri?.startsWith('spotify:track:')) {
        const q = `track:${t.name} artist:${t.artists.join(' ')}`;
        const res = await this.searchTracks(q, 1);
        if (!res.tracks.length) continue;
        const found = res.tracks[0];
        if (!found?.uri) continue;
        uri = found.uri;
      }
      if (seen.has(uri)) continue;
      seen.add(uri);
      const id = uri.split(':').pop();
      if (!id) continue;
      // verify availability via getTrack
      try {
        const r = await this.api.getTrack(id);
        const tr = r.body;
        cleaned.push({
          name: tr.name,
          artists: tr.artists.map(a => a.name),
          uri: tr.uri,
          popularity: tr.popularity
        });
        // stop if reached maxTracks
        if (maxTracks !== undefined && cleaned.length >= maxTracks) {
          break;
        }
      } catch(error) {
        console.error(`Error fetching track or audio features for URI ${uri}:`, error);
        continue;
      }
    }
    // slice to maxTracks if provided
    const finalTracks = maxTracks !== undefined ? cleaned.slice(0, maxTracks) : cleaned;
    // log percentage of tracks retained after scrubbing
    const originalCount = playlist.tracks.length;
    const percent = originalCount > 0 ? (finalTracks.length / originalCount) * 100 : 0;
    console.log(`SpotifyService: retained ${finalTracks.length}/${originalCount} tracks (${percent.toFixed(1)}%) after scrubbing`);
    return { name: playlist.name, tags: playlist.tags, tracks: finalTracks };
  }
}
