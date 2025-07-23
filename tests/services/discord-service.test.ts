// @ts-nocheck
import { DiscordService } from '../../src/services/discord-service';
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer } from '@discordjs/voice';
import { jest } from '@jest/globals';

describe('DiscordService', () => {
  let mockLogin: jest.Mock;
  let mockOnce: jest.Mock;
  let mockFetch: jest.Mock;
  let mockDestroyClient: jest.Mock;
  let mockConnection: any;
  let mockSubscribe: jest.Mock;
  let mockPlay: jest.Mock;
  let service: DiscordService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogin = jest.fn();
    mockOnce = jest.fn();
    mockFetch = jest.fn();
    mockDestroyClient = jest.fn();

    // Mock Client
    (Client as unknown as jest.Mock).mockImplementation(() => ({
      login: mockLogin,
      once: mockOnce,
      channels: { fetch: mockFetch },
      destroy: mockDestroyClient
    }));

    // Mock joinVoiceChannel and player
    mockSubscribe = jest.fn();
    mockConnection = { subscribe: mockSubscribe, destroy: jest.fn() };
    (joinVoiceChannel as unknown as jest.Mock).mockReturnValue(mockConnection);

    mockPlay = jest.fn();
    const mockPlayer = { play: mockPlay, once: jest.fn((event, cb) => cb()) };
    (createAudioPlayer as unknown as jest.Mock).mockReturnValue(mockPlayer);

    // Instantiate service (constructor calls login)
    service = new DiscordService('test-token', 'test-channel-id');
  });

  it('should login on construction', () => {
    expect(mockLogin).toHaveBeenCalledWith('test-token');
  });

  it('init should wait for ready and join voice channel', async () => {
    // Mock ready event trigger
    mockOnce.mockImplementation((event: string, cb: () => void) => {
      if (event === 'ready') cb();
    });
    // Mock channel fetch
    const fakeChannel: any = { id: 'chan', guild: { id: 'guild', voiceAdapterCreator: 'adapter' } };
    mockFetch.mockResolvedValue(fakeChannel);

    await service.init();

    expect(mockOnce).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockFetch).toHaveBeenCalledWith('test-channel-id');
    expect(joinVoiceChannel).toHaveBeenCalledWith({
      channelId: 'chan',
      guildId: 'guild',
      adapterCreator: 'adapter'
    });
    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Object));
  });

  it('playResource should play and await Idle', async () => {
    const resource = {} as any;
    // Need to init first to set up player
    mockOnce.mockImplementation((event: string, cb: () => void) => cb());
    mockFetch.mockResolvedValue({ id: 'chan', guild: { id: 'guild', voiceAdapterCreator: 'adapter' } });
    await service.init();

    await service.playResource(resource);
    expect(mockPlay).toHaveBeenCalledWith(resource);
  });

  it('destroy should tear down connection and client', () => {
    service.destroy();
    expect(mockConnection.destroy).toHaveBeenCalled();
    expect(mockDestroyClient).toHaveBeenCalled();
  });
});
