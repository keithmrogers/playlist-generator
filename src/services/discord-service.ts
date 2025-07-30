import { Client, GatewayIntentBits, VoiceBasedChannel } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, AudioPlayer, AudioResource, VoiceConnection, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';

export class DiscordService {
  private lastPlayerStatus?: AudioPlayerStatus;
  private client: Client;
  private player?: AudioPlayer;
  private channelId: string;
  private guildId?: string;

  constructor(token: string, channelId: string) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    this.channelId = channelId;
    this.client.login(token);
  }

  async init(): Promise<void> {
    // wait for the Discord client to be ready
    await new Promise<void>(resolve => this.client.once('ready', () => resolve()));
  }

  getVoiceConnection(): VoiceConnection | undefined {
    if (!this.guildId) return undefined;
    return getVoiceConnection(this.guildId);
  }

  /**
   * Connect to the voice channel and set up the audio player
   */
  public async connectVoice(): Promise<void> {
    const channel = await this.client.channels.fetch(this.channelId) as VoiceBasedChannel;
    this.guildId = channel.guild.id;

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });
    
    //https://github.com/discordjs/discord.js/issues/9185#issuecomment-1452514375
    const networkStateChangeHandler = (newNetworkState: any) => {
      const newUdp = Reflect.get(newNetworkState, 'udp');
      clearInterval(newUdp?.keepAliveInterval);
    }

    connection.on('stateChange', (oldState: any, newState: any) => {
      const oldNetworking = Reflect.get(oldState, 'networking');
      const newNetworking = Reflect.get(newState, 'networking');

      oldNetworking?.off('stateChange', networkStateChangeHandler);
      newNetworking?.on('stateChange', networkStateChangeHandler);
    });
  }

  async playResource(resource: AudioResource): Promise<void> {
    if (!this.player) {
      this.player = createAudioPlayer();
      // track audio player state
      this.player.on('stateChange', (_old, newState) => {
        this.lastPlayerStatus = newState.status;
      });
      this.getVoiceConnection()?.subscribe(this.player);
    };

    this.player.play(resource);
    // wait for Idle or suppress errors
    await new Promise<void>((resolve) => {
      const onIdle = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        console.warn('AudioPlayer stream error suppressed:', error.message);
        cleanup();
        resolve();
      };
      const cleanup = () => {
        this.player!.off(AudioPlayerStatus.Idle, onIdle);
        this.player!.off('error', onError as any);
      };
      this.player!.once(AudioPlayerStatus.Idle, onIdle);
      this.player!.once('error', onError as any);
    });
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
    this.getVoiceConnection()?.destroy();
    this.client.destroy();
  }
  /** Get the last known AudioPlayer status */
  public getPlayerStatus(): AudioPlayerStatus | undefined {
    return this.lastPlayerStatus;
  }
  /** returns whether the Discord client is ready and the voice connection is established */
  public healthCheck(): { clientReady: boolean; connectionStatus?: string; connectionPing?: number } {
    const clientReady = this.client.readyAt !== null;
    const connection = this.getVoiceConnection();
    const connectionStatus = connection?.state.status;
    const connectionPing = connection?.ping?.ws;

    console.log(`Health check: Client ready: ${clientReady}, Connection status: ${connectionStatus}, Ping: ${connectionPing}ms`);
    return { clientReady, connectionStatus, connectionPing };
  }
}
