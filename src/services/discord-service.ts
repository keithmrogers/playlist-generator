import { Client, GatewayIntentBits, VoiceBasedChannel } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, AudioPlayer, AudioResource, VoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';

export class DiscordService {
  private client: Client;
  private connection?: VoiceConnection;
  private player?: AudioPlayer;
  private channelId: string;

  constructor(token: string, channelId: string) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    this.channelId = channelId;
    this.client.login(token);
  }

  async init(): Promise<void> {
    await new Promise<void>(resolve => this.client.once('ready', () => resolve()));
    const channel = await this.client.channels.fetch(this.channelId) as VoiceBasedChannel;
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });
    this.player = createAudioPlayer();
    this.connection.subscribe(this.player);
  }

  async playResource(resource: AudioResource): Promise<void> {
    if (!this.player) throw new Error('DiscordService is not initialized');
    this.player.play(resource);
    await new Promise<void>(resolve => this.player!.once(AudioPlayerStatus.Idle, resolve));
  }

  destroy(): void {
    this.connection?.destroy();
    this.client.destroy();
  }

  /** returns whether the Discord client is ready and the voice connection is established */
  public healthCheck(): { clientReady: boolean; voiceConnected: boolean } {
    const clientReady = this.client.readyAt !== null;
    const voiceConnected = this.connection?.state.status === VoiceConnectionStatus.Ready;
    return { clientReady, voiceConnected: !!voiceConnected };
  }
}
