import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { DiscordService } from './services/discord-service.js';
import { PlaylistService } from './services/playlist-service.js';
import { PlaybackState } from './playback-state.js';
import { PLAYLIST_FOLDER } from './config.js';

const token = process.env['DISCORD_TOKEN'];
const channelId = process.env['DISCORD_VOICE_CHANNEL_ID'];

if (!token || !channelId) {
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'src', 'public');
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const discord = new DiscordService(token, channelId);
const playlists = new PlaylistService(PLAYLIST_FOLDER);

await discord.init();
await discord.connectVoice();

const cachePath = path.join(PLAYLIST_FOLDER, 'youtube-cache.json');
const playback = new PlaybackState(discord, cachePath);
const app = express();
app.use(express.json());
app.use(express.static(publicDir));

// --- Helpers ---

async function findPlaylist(name: string) {
  const files = await playlists.getPlaylists();
  for (const file of files) {
    const playlist = await playlists.loadPlaylist(file);
    if (playlist.name === name) return playlist;
  }
  return null;
}

// --- Routes ---

app.get('/playlists', async (_req, res) => {
  const files = await playlists.getPlaylists();
  const result = await Promise.all(
    files.map(async (file) => {
      const p = await playlists.loadPlaylist(file);
      return { name: p.name, trackCount: p.tracks.length };
    })
  );
  res.json(result);
});

app.post('/play/:name', async (req, res) => {
  const playlist = await findPlaylist(req.params['name']!);
  if (!playlist) {
    res.status(404).json({ error: `Playlist "${req.params['name']}" not found` });
    return;
  }
  await playback.load(playlist);
  res.json({ ok: true, playlist: playlist.name });
});

app.post('/pause', (_req, res) => {
  if (!playback.isActive()) {
    res.status(409).json({ error: 'No active playlist' });
    return;
  }
  playback.pause();
  res.json({ ok: true });
});

app.post('/resume', (_req, res) => {
  if (!playback.isActive()) {
    res.status(409).json({ error: 'No active playlist' });
    return;
  }
  playback.resume();
  res.json({ ok: true });
});

app.post('/skip', async (_req, res) => {
  if (!playback.isActive()) {
    res.status(409).json({ error: 'No active playlist' });
    return;
  }
  await playback.skip();
  res.json({ ok: true });
});

app.get('/debug', (_req, res) => {
  const conn = discord.getVoiceConnection();
  res.json({
    discord: {
      clientReady: discord.healthCheck().clientReady,
      connectionStatus: conn?.state.status ?? 'none',
      connectionPing: conn?.ping,
    },
    playback: playback.getState(),
  });
});

app.get('/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  playback.addSSEClient(res);
  req.on('close', () => playback.removeSSEClient(res));
});

// --- Start ---

const server = app.listen(PORT);

process.on('SIGTERM', () => {
  playback.destroy();
  discord.destroy();
  server.close(() => process.exit(0));
});
