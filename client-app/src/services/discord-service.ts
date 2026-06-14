import { Client, GatewayIntentBits, VoiceBasedChannel } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, AudioPlayer, AudioResource, VoiceConnection, AudioPlayerStatus, getVoiceConnection, VoiceConnectionStatus, entersState } from '@discordjs/voice';

export class DiscordService {
  private lastPlayerStatus?: AudioPlayerStatus;
  private client: Client;
  private player?: AudioPlayer;
  private token: string;
  private channelId: string;
  private guildId?: string;
  /** Called when the voice connection is lost (kicked, network drop, etc.) */
  public onDisconnect?: () => void;

  constructor(token: string, channelId: string) {
    this.token = token;
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    this.channelId = channelId;
  }

  async connect(): Promise<void> {
    await this.client.login(this.token);
  }

  async init(): Promise<void> {
    await new Promise<void>(resolve => this.client.once('clientReady', () => resolve()));
  }

  getVoiceConnection(): VoiceConnection | undefined {
    if (!this.guildId) return undefined;
    return getVoiceConnection(this.guildId);
  }

  /**
   * Connect (or reconnect) to the voice channel.
   * Safe to call repeatedly — destroys any non-Ready existing connection first, then
   * re-subscribes the audio player to the fresh connection. This lets the button always
   * recover from a kick and take over from another bot instance (last-press-wins).
   */
  public async connectVoice(): Promise<void> {
    const channel = await this.client.channels.fetch(this.channelId) as VoiceBasedChannel;
    this.guildId = channel.guild.id;

    // If already healthy, nothing to do.
    const existing = getVoiceConnection(this.guildId);
    if (existing?.state.status === VoiceConnectionStatus.Ready) {
      if (this.player) existing.subscribe(this.player);
      return;
    }

    // Tear down any stale/disconnected connection so joinVoiceChannel creates a fresh one.
    if (existing) {
      try { existing.destroy(); } catch { /* already gone */ }
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    connection.on('stateChange', (oldState: any, newState: any) => {
      //https://github.com/discordjs/discord.js/issues/9185#issuecomment-1452514375
      const networkStateChangeHandler = (newNetworkState: any) => {
        const newUdp = Reflect.get(newNetworkState, 'udp');
        clearInterval(newUdp?.keepAliveInterval);
      };
      const oldNetworking = Reflect.get(oldState, 'networking');
      const newNetworking = Reflect.get(newState, 'networking');
      oldNetworking?.off('stateChange', networkStateChangeHandler);
      newNetworking?.on('stateChange', networkStateChangeHandler);

      // Notify server when the bot is kicked or the connection otherwise drops.
      if (
        newState.status === VoiceConnectionStatus.Disconnected ||
        newState.status === VoiceConnectionStatus.Destroyed
      ) {
        this.onDisconnect?.();
      }
    });

    connection.on('error', () => {});

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Re-subscribe the existing player so audio resumes on the new connection.
    if (this.player) {
      connection.subscribe(this.player);
    }
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

  /** Start playing a resource without blocking — caller is responsible for advancement */
  public playNow(resource: AudioResource): void {
    if (!this.player) {
      this.player = createAudioPlayer();
      this.player.on('stateChange', (_old, newState) => {
        this.lastPlayerStatus = newState.status;
      });
      this.player.on('error', () => {});
      this.getVoiceConnection()?.subscribe(this.player);
    }
    this.player.play(resource);
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
    this.player?.stop();
  }

  /** Leave the voice channel without destroying the Discord client */
  public disconnectVoice(): void {
    const conn = this.getVoiceConnection();
    this.guildId = undefined;          // clear first so getVoiceConnection returns undefined elsewhere
    this.lastPlayerStatus = undefined;
    this.player?.stop();
    this.player = undefined;
    try {
      conn?.disconnect();              // sends channel_id: null to Discord gateway
      conn?.destroy();                 // cleans up internal state
    } catch {
      // already destroyed or adapter unavailable
    }
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
