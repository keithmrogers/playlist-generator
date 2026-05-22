import { jest } from '@jest/globals';
import { Readable } from 'stream';

const mockStdout = new Readable({ read() {} });
const mockStderr = new Readable({ read() {} });
const mockProcess = {
  stdout: mockStdout,
  stderr: mockStderr,
  on: jest.fn().mockReturnThis(),
  kill: jest.fn(),
  killed: false,
};

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn(() => mockProcess),
}));

describe('YouTubeService.getAudioStream', () => {
  let service: any;
  let spawnMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProcess.on = jest.fn().mockReturnThis();
    mockProcess.kill = jest.fn();
    (mockStdout as any).on = jest.fn().mockReturnThis();
    (mockStderr as any).on = jest.fn().mockReturnThis();

    const { spawn } = await import('child_process');
    spawnMock = spawn as jest.Mock;
    spawnMock.mockImplementation((() => mockProcess) as any);

    const { YouTubeService } = await import('../../src/services/youtube-service.js');
    service = new YouTubeService();
  });

  it('spawns the bundled yt-dlp binary with the correct args', async () => {
    await service.getAudioStream('https://www.youtube.com/watch?v=test123');

    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining('yt-dlp'),
      expect.arrayContaining([
        'https://www.youtube.com/watch?v=test123',
        '-o', '-',
        '-f', 'bestaudio[ext=webm]/bestaudio/best',
        '--quiet',
        '--no-playlist',
        '--js-runtimes',
        expect.stringContaining('node:'),
      ]),
      expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] })
    );
  });

  it('returns the stdout stream from the spawned process', async () => {
    const stream = await service.getAudioStream('https://www.youtube.com/watch?v=test123');
    expect(stream).toBe(mockStdout);
  });

  it('registers error suppression on the process and stream', async () => {
    await service.getAudioStream('https://www.youtube.com/watch?v=test123');
    expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect((mockStderr as any).on).toHaveBeenCalledWith('error', expect.any(Function));
    expect((mockStdout as any).on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('cancelStream kills the active process', async () => {
    await service.getAudioStream('https://www.youtube.com/watch?v=test123');
    service.cancelStream();
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGINT');
  });

  it('cancelStream is a no-op when no stream is active', async () => {
    expect(() => service.cancelStream()).not.toThrow();
    expect(mockProcess.kill).not.toHaveBeenCalled();
  });
});
