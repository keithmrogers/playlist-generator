// TagService: fetch top tags from Last.fm API
// Requires LASTFM_API_KEY env var or pass apiKey in constructor
// Install dependency: npm install node-fetch

import fetch from 'node-fetch';
import { Track } from './playlist-service.js';

export interface TagServiceOptions {
    topN?: number;
    batchSize?: number;
}

export class TagService {
    private apiKey: string;
    private apiBase = 'http://ws.audioscrobbler.com/2.0/';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env['LASTFM_API_KEY']!;
        if (!this.apiKey) {
            throw new Error('LASTFM_API_KEY is required');
        }
    }

    /**
     * Fetch top tags for a single track
     */
    async getTopTagsForTrack(track: Track, topN: number = 5): Promise<string[]> {
        const artist = encodeURIComponent(track.artists[0] || '');
        const trackName = encodeURIComponent(track.name);
        const url = `${this.apiBase}?method=track.getTopTags&artist=${artist}&track=${trackName}&api_key=${this.apiKey}&format=json`;
        try {
            const res = await fetch(url);
            const data: any = await res.json();
            const tags = data.toptags?.tag;
            if (!tags || !Array.isArray(tags)) return [];
            return tags.slice(0, topN).map((t: any) => t.name);
        } catch (err) {
            console.error(`TagService: error fetching tags for ${track.name}`, err);
            return [];
        }
    }

    /**
     * Fetch top tags for multiple tracks, processing in batches
     */
    async getTopTagsForTracks(
        tracks: Track[],
        options: TagServiceOptions = {}
    ): Promise<Record<string, string[]>> {
        const topN = options.topN ?? 5;
        const batchSize = options.batchSize ?? 5;
        const results: Record<string, string[]> = {};

        for (let i = 0; i < tracks.length; i += batchSize) {
            const batch = tracks.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async track => {
                    const tags = await this.getTopTagsForTrack(track, topN);
                    // key by Spotify track ID extracted from URI
                    const key = track.uri ?? '';
                    results[key] = tags;
                })
            );
        }
        return results;
    }

    /**
     * Health check for Last.fm API
     */
    async healthCheck(): Promise<boolean> {
        console.log('Checking Last.fm API...');
        try {
            // perform a simple request with a well-known track
            await this.getTopTagsForTrack({ name: 'Thriller', artists: ['Michael Jackson'] });
            console.log('Last.fm: OK');
            return true;
        } catch (err) {
            console.error('Last.fm: ERROR', err);
            return false;
        }
    }
}
