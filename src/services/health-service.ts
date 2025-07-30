import SpotifyWebApi from 'spotify-web-api-node';
import fs from 'fs';
import path from 'path';
import { DiscordService } from './discord-service.js';
import { YouTubeService } from './youtube-service.js';
import { TagService } from './tag-service.js';
import 'dotenv/config';

export class HealthService {
  private spotifyApi: SpotifyWebApi;

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env['SPOTIFY_CLIENT_ID']!,
      clientSecret: process.env['SPOTIFY_CLIENT_SECRET']!,
    });
  }

  async checkAll(): Promise<boolean> {
    const spotifyOk = await this.checkSpotify();
    const discordOk = await this.checkDiscord();
    const ytOk = await this.checkYouTube();
    const tagsOk = await this.checkTagService();
    const configOk = await this.checkCampaignConfig();
    return spotifyOk && discordOk && ytOk && tagsOk && configOk;
  }

  private async checkSpotify(): Promise<boolean> {
    console.log('Checking Spotify...');
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body['access_token']);
      console.log('Spotify: OK');
      return true;
    } catch (err) {
      console.error('Spotify: ERROR', err);
      return false;
    }
  }

  private async checkDiscord(): Promise<boolean> {
    console.log('Checking Discord...');
    if (process.env['DISCORD_TOKEN'] && process.env['DISCORD_VOICE_CHANNEL_ID']) {
      const discord = new DiscordService(
        process.env['DISCORD_TOKEN'],
        process.env['DISCORD_VOICE_CHANNEL_ID']
      );
      try {
        await discord.init();
        const { clientReady } = discord.healthCheck();
        if (clientReady ) {
          console.log('Discord: OK');
          return true;
        } else {
          console.error('Discord: ERROR', { clientReady });
          return false;
        }
      } catch (err) {
        console.error('Discord: ERROR during init', err);
        return false;
      } finally {
        discord.destroy();
      }
    } else {
      console.error('Discord: ERROR Missing DISCORD_TOKEN or DISCORD_VOICE_CHANNEL_ID');
      return false;
    }
  }

  private async checkYouTube(): Promise<boolean> {
    console.log('Checking yt-dlp (YouTube CLI)...');
    try {
      const yt = new YouTubeService();
      await yt.healthCheck();
      console.log('yt-dlp: OK');
      return true;
    } catch (err) {
      console.error('yt-dlp: ERROR', err);
      return false;
    }
  }

  private async checkCampaignConfig(): Promise<boolean> {
    console.log('Checking campaign config file...');
    const configPath = path.join(process.cwd(), 'config/campaign.json');
    try {
      fs.accessSync(configPath);
      console.log('Campaign config: OK');
      return true;
    } catch (err) {
      console.error('Campaign config: ERROR', err);
      return false;
    }
  }
  /**
   * Health check for Last.fm TagService
   */
  private async checkTagService(): Promise<boolean> {
    console.log('Checking Last.fm API...');
    try {
      const tagSvc = new TagService();
      const ok = await tagSvc.healthCheck();
      return ok;
    } catch (err) {
      console.error('Last.fm: ERROR', err);
      return false;
    }
  }
}
