# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `client-app/`:

```bash
npm run build       # Compile TypeScript → dist/
npm run dev         # Watch mode (auto-recompile)
npm test            # Run all tests
npm test -- --testPathPattern=spotify   # Run a single test file
npm start           # Run the CLI (requires build first)
```

## Architecture

This is a TypeScript/Node.js CLI that generates Spotify playlists via LLM prompts and streams them to Discord voice channels. The entry point is `client-app/src/cli.tsx`, which runs a health check then renders the Ink (React-in-terminal) UI.

**Data flow — Generation path:**
1. `PlaylistMaker.tsx` collects scene parameters → `PromptService` interpolates into an LLM prompt template
2. User copies the prompt (auto-copied to clipboard), gets a JSON playlist back from an external LLM, and pastes it in
3. `SpotifyService` scrubs the tracks: verifies availability via `api.getTrack()`, deduplicates by URI, filters by popularity threshold (default 30)
4. `TagService` enriches tracks with Last.fm genre/mood tags (batched, concurrent)
5. `PlaylistService` persists as JSON to `playlists/` (or `PLAYLIST_FOLDER`)

**Data flow — Streaming path:**
1. `PlaylistPicker.tsx` lists saved JSON playlists from disk
2. `StreamPlayer.tsx` drives playback; end-of-track detected via Playing→Idle state transition
3. `YouTubeService` spawns `yt-dlp` as a child process to search and extract audio streams
4. `DiscordService` manages the voice channel connection and audio player lifecycle

**Module system:** ESM (`"type": "module"`), TypeScript compiles to `dist/`, path alias `@/` → `src/` (configured in both `tsconfig.json` and `jest.config.json`).

## Key Implementation Details

- **Discord voice UDP workaround:** `DiscordService` uses reflection-based networking state to work around `discord.js` issue #9185 (keepalive bug).
- **YouTube subprocess:** `YouTubeService` uses `child_process.spawn` (not `execFile`) to avoid buffer size limits; errors are suppressed to prevent unhandled rejections.
- **Spotify scrubbing:** Tracks must pass `api.getTrack()` availability check; duplicates are removed by Spotify URI before popularity filtering.
- **Tag batching:** `TagService` processes Last.fm requests in configurable batches (`batchSize` default 5, `topN` default 5) to avoid rate limits.
- **Theme:** Nord color scheme distributed via React context (`ThemeProvider.tsx`); all UI components consume it.

## Environment Variables

```
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
DISCORD_TOKEN
DISCORD_VOICE_CHANNEL_ID
LASTFM_API_KEY
YTDLP_PATH              # optional: path to yt-dlp binary
PLAYLIST_FOLDER         # optional: custom playlists dir (default: ./playlists)
```

## Campaign Configuration

`client-app/config/campaign.json` (copy from `campaign.json.example`) sets the campaign metadata (name, setting, time period, styles, influences) that `PromptService` injects into LLM prompt templates from `templates/promptTemplates.json`. `samples/vars.json` has 7 example variable sets for quick testing.
