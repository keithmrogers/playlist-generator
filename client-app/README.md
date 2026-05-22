# D&D Soundboard

A mobile-friendly web UI for streaming ambient D&D music to a Discord voice channel. Tap a mood button to switch music instantly — no keyboard required.

## Quick Start

### 1. Build

```bash
npm install
npm run build
```

### 2. Configure secrets

```bash
cp .env.example .env
# Edit .env with your values
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_VOICE_CHANNEL_ID` | Yes | Voice channel the bot will join |
| `PORT` | No | HTTP port (default: 3000) |
| `PLAYLIST_FOLDER` | No | Path to playlist JSON files (default: `./playlists`) |

### 3. Add playlists

Place JSON files in your playlists directory. The `name` field becomes the mood button label:

```json
{
  "name": "Combat",
  "tracks": [
    { "name": "Prelude in D Minor", "artists": ["Kevin MacLeod"] }
  ]
}
```

### 4. Run

```bash
npm start
```

Open `http://localhost:3000`.

---

## Running in Podman

### Build the image

```bash
npm run build
podman build -t soundboard .
```

### Option A — env file (simplest)

```bash
podman run -d \
  --name soundboard \
  --env-file .env \
  -v /path/to/playlists:/app/playlists \
  -p 3000:3000 \
  soundboard
```

### Option B — Podman secrets (more secure)

```bash
printf 'your-token' | podman secret create discord_token -
printf 'your-channel-id' | podman secret create discord_channel_id -

podman run -d \
  --name soundboard \
  --secret discord_token,type=env,target=DISCORD_TOKEN \
  --secret discord_channel_id,type=env,target=DISCORD_VOICE_CHANNEL_ID \
  -v /path/to/playlists:/app/playlists \
  -p 3000:3000 \
  soundboard
```

Access the UI at `http://<server-ip>:3000`.

```bash
podman stop soundboard   # graceful shutdown, Discord disconnects cleanly
```

---

## Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run dev` | Watch mode (auto-recompile) |
| `npm start` | Start the server (`node dist/server.js`) |
| `npm test` | Run tests |

---

## Security note

The UI has no authentication. Only expose port 3000 on your local network.

## License

MIT
