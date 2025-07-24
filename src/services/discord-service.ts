import { Client, GatewayIntentBits, VoiceBasedChannel } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, AudioPlayer, AudioResource, VoiceConnection, AudioPlayerStatus } from '@discordjs/voice';

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
    // wait for the Discord client to be ready
    await new Promise<void>(resolve => this.client.once('ready', () => resolve()));
  }

  /**
   * Connect to the voice channel and set up the audio player
   */
  public async connectVoice(): Promise<void> {
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

  /** Pause the current audio resource */
  public pause(): void {
    if (!this.player) throw new Error('DiscordService is not initialized');
    this.player.pause(true);
  }

  /** Resume the current audio resource */
  public resume(): void {
    if (!this.player) throw new Error('DiscordService is not initialized');
    this.player.unpause();
  }

  /** Stop the current audio resource */
  public stop(): void {
    if (!this.player) throw new Error('DiscordService is not initialized');
    this.player.stop();
  }

  destroy(): void {
    this.connection?.destroy();
    this.client.destroy();
  }
  /** returns whether the Discord client is ready and the voice connection is established */
  public healthCheck(): { clientReady: boolean } {
    const clientReady = this.client.readyAt !== null;
    console.log(`Health check: Client ready: ${clientReady}`);
    return { clientReady };
  }
}
