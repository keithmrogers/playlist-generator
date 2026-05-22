import { DiscordService } from './discord-service.js';
import { YouTubeService } from './youtube-service.js';
import 'dotenv/config';

export class HealthService {
  async checkAll(): Promise<boolean> {
    const discordOk = await this.checkDiscord();
    const ytOk = await this.checkYouTube();
    return discordOk && ytOk;
  }

  private async checkDiscord(): Promise<boolean> {
    if (!process.env['DISCORD_TOKEN'] || !process.env['DISCORD_VOICE_CHANNEL_ID']) {
      console.error('Discord: ERROR Missing DISCORD_TOKEN or DISCORD_VOICE_CHANNEL_ID');
      return false;
    }
    const discord = new DiscordService(
      process.env['DISCORD_TOKEN'],
      process.env['DISCORD_VOICE_CHANNEL_ID']
    );
    try {
      await discord.init();
      const { clientReady } = discord.healthCheck();
      if (clientReady) {
        console.log('Discord: OK');
        return true;
      }
      console.error('Discord: ERROR client not ready');
      return false;
    } catch (err) {
      console.error('Discord: ERROR during init', err);
      return false;
    } finally {
      discord.destroy();
    }
  }

  private async checkYouTube(): Promise<boolean> {
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
}
