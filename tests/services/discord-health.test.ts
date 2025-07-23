// @ts-nocheck
import { DiscordService } from '../../src/services/discord-service';
import { Client } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } from '@discordjs/voice';
import { jest } from '@jest/globals';

jest.mock('discord.js');
jest.mock('@discordjs/voice');

describe('DiscordService Health Check', () => {
  let service;
  let mockLogin;
  let mockOnce;
  let mockFetch;
  let mockConnection;
  let mockPlayer;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogin = jest.fn();
    mockOnce = jest.fn((event, cb) => cb());
    mockFetch = jest.fn().mockResolvedValue({ id: 'chan', guild: { id: 'guild', voiceAdapterCreator: 'adapter' } });
    mockConnection = { subscribe: jest.fn(), destroy: jest.fn() };
    mockPlayer = { play: jest.fn(), once: jest.fn((event, cb) => cb()) };

    (Client as unknown as jest.Mock).mockImplementation(() => ({ login: mockLogin, once: mockOnce, channels: { fetch: mockFetch }, destroy: jest.fn() }));
    (joinVoiceChannel as unknown as jest.Mock).mockReturnValue(mockConnection);
    (createAudioPlayer as unknown as jest.Mock).mockReturnValue(mockPlayer);

    service = new DiscordService('token', 'chan');
  });

  it('should init and play resource without errors', async () => {
    await expect(service.init()).resolves.not.toThrow();
    await expect(service.playResource({} as any)).resolves.not.toThrow();
    service.destroy();
  });
});
