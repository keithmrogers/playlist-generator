import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Minimal Discord service mock
const mockDiscord = {
  getPlayerStatus: jest.fn().mockReturnValue(undefined),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  playNow: jest.fn(),
};

// yt-dlp mock so YouTubeService doesn't spawn real processes
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

const mockYtExec = jest.fn();
jest.unstable_mockModule('youtube-dl-exec', () => ({
  default: Object.assign(jest.fn(), { exec: mockYtExec }),
}));

const testPlaylist = {
  name: 'Ambient',
  tracks: [
    { name: 'Track A', artists: ['Artist 1'] },
    { name: 'Track B', artists: ['Artist 2'] },
    { name: 'Track C', artists: ['Artist 3'] },
  ],
};

describe('PlaybackState — local mode methods', () => {
  let PlaybackState: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProcess.on = jest.fn().mockReturnThis();
    (mockStdout as any).on = jest.fn().mockReturnThis();
    (mockStderr as any).on = jest.fn().mockReturnThis();
    ({ PlaybackState } = await import('../../src/playback-state.js'));
  });

  describe('loadLocalMode', () => {
    it('sets the active playlist without touching Discord', async () => {
      const state = new PlaybackState(mockDiscord as any);
      await state.loadLocalMode(testPlaylist);

      expect(mockDiscord.stop).not.toHaveBeenCalled();
      expect(mockDiscord.playNow).not.toHaveBeenCalled();
      expect(state.isActive()).toBe(true);
    });

    it('resets track index to 0', async () => {
      const state = new PlaybackState(mockDiscord as any);
      await state.loadLocalMode(testPlaylist);

      const nowPlaying = state.getState();
      expect(nowPlaying.trackIndex).toBe(0);
      expect(nowPlaying.totalTracks).toBe(testPlaylist.tracks.length);
      expect(nowPlaying.playlistName).toBe('Ambient');
    });

    it('broadcasts SSE state after loading', async () => {
      const state = new PlaybackState(mockDiscord as any);
      const broadcasts: any[] = [];
      state.addSSEClient({ write: (d: string) => broadcasts.push(JSON.parse(d.replace('data: ', ''))) } as any);

      await state.loadLocalMode(testPlaylist);

      const last = broadcasts[broadcasts.length - 1];
      expect(last.playlistName).toBe('Ambient');
    });
  });

  describe('skipLocalMode', () => {
    it('advances track index without Discord playback', async () => {
      const state = new PlaybackState(mockDiscord as any);
      await state.loadLocalMode(testPlaylist);
      const before = state.getState().trackIndex;

      state.skipLocalMode();

      expect(state.getState().trackIndex).toBe((before + 1) % testPlaylist.tracks.length);
      expect(mockDiscord.playNow).not.toHaveBeenCalled();
    });

    it('wraps around to 0 after the last track', async () => {
      const state = new PlaybackState(mockDiscord as any);
      const single = { name: 'Solo', tracks: [{ name: 'Only Track', artists: [] }] };
      await state.loadLocalMode(single);

      state.skipLocalMode();

      expect(state.getState().trackIndex).toBe(0);
    });

    it('broadcasts SSE on skip', async () => {
      const state = new PlaybackState(mockDiscord as any);
      await state.loadLocalMode(testPlaylist);
      const broadcasts: any[] = [];
      state.addSSEClient({ write: (d: string) => broadcasts.push(JSON.parse(d.replace('data: ', ''))) } as any);

      state.skipLocalMode();

      expect(broadcasts.length).toBeGreaterThan(0);
    });
  });
});
