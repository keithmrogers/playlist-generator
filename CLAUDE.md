# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `client-app/`:

```bash
npm run build       # Compile TypeScript → dist/
npm run dev         # Watch mode (auto-recompile)
npm start           # Start the server (requires build first)
npm test            # Run all tests
npm test -- --testPathPattern=discord   # Run a single test file
```

To run in a container (build first):

```bash
podman build -t soundboard .
podman run --env-file .env -v /path/to/playlists:/app/playlists -p 3000:3000 soundboard
```

## Architecture

This is a TypeScript/Node.js HTTP server that streams ambient D&D music playlists to a Discord voice channel. A browser-based soundboard UI (served by the same server) lets you switch moods from a phone or laptop at the table.

**Entry point:** `src/server.ts` → compiles to `dist/server.js`

**Data flow:**
1. On startup, `DiscordService` connects to the configured voice channel and holds that connection for the lifetime of the process.
2. `PlaybackState` (`src/playback-state.ts`) owns the active playlist, shuffled track queue, current index, and SSE broadcaster. It polls `DiscordService.getPlayerStatus()` every 200ms; a Playing→Idle transition triggers auto-advance to the next track.
3. Express serves REST endpoints (`/playlists`, `/play/:name`, `/pause`, `/resume`, `/skip`) and an SSE stream (`/status`) for real-time now-playing updates.
4. Static files in `src/public/` (HTML/CSS/JS) are served at `/`. The frontend connects to `/status` via `EventSource` and updates the UI without polling.
5. When a mood button is tapped: `POST /play/:name` → `PlaybackState.load()` stops current audio immediately, shuffles the new playlist, and starts track 0. `YouTubeService` searches YouTube and spawns a `yt-dlp` subprocess to stream audio; `DiscordService.playNow()` starts the audio player without blocking.

**Module system:** ESM (`"type": "module"`), TypeScript compiles to `dist/`. Static assets in `src/public/` are not compiled — the server references them via `import.meta.url`-relative path.

## Key Implementation Details

- **Discord voice UDP workaround:** `DiscordService` uses reflection-based networking state to work around `discord.js` issue #9185 (keepalive bug).
- **Non-blocking playback:** `DiscordService.playNow()` starts the audio player without awaiting — `PlaybackState`'s poll loop handles advancement via the Playing→Idle state transition. This avoids concurrent `playResource` promise conflicts when switching playlists mid-song.
- **Playlist switching — immediate cut:** `PlaybackState.load()` resets `prevPlayerStatus = undefined` before calling `discord.stop()`, preventing the poll loop from misreading the forced Idle as a natural track end and triggering a spurious advance.
- **YouTube subprocess:** `YouTubeService` uses `child_process.spawn` (not `execFile`) to avoid buffer size limits; errors are suppressed to prevent unhandled rejections.
- **SSE:** `GET /status` uses Server-Sent Events (one-way, browser auto-reconnects). State is pushed to all connected clients on every player status change (within 200ms poll interval).

## Environment Variables

```
DISCORD_TOKEN               # required
DISCORD_VOICE_CHANNEL_ID    # required
PORT                        # optional, default 3000
PLAYLIST_FOLDER             # optional, default ./playlists
```

## Playlist Format

Each JSON file in `PLAYLIST_FOLDER` must have a `name` field (used as the mood button label) and a `tracks` array:

```json
{
  "name": "Combat",
  "tracks": [
    { "name": "Track Title", "artists": ["Artist Name"] }
  ]
}
```
