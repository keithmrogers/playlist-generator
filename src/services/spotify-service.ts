import SpotifyWebApi from 'spotify-web-api-node';
import { Track, Playlist } from './playlist-service.js';

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
        console.log(`Invalid or missing URI, searching for track: ${t.name}`);
        const q = `track:${t.name} artist:${t.artists.join(' ')}`;
        const res = await this.searchTracks(q, 1);
        if (!res.tracks.length) continue;
        const found = res.tracks[0];
        if (!found?.uri) continue;
        uri = found.uri;
      }
      if (seen.has(uri)) continue;
      console.log(`Adding unique track URI: ${uri}`);
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
