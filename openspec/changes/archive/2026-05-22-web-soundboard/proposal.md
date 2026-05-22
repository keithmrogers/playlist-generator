## Why

The current app is a terminal-only CLI that requires a keyboard at the machine running it — impractical during a D&D session where the DM needs to switch ambient music quickly from a phone or tablet at the table. Replacing the Ink CLI with a browser-accessible web UI removes that constraint and makes the tool actually usable mid-session.

## What Changes

- **BREAKING** Remove all Ink/React terminal UI components (`PlaylistMaker`, `PlaylistPicker`, `StreamPlayer`, `PlaylistWithTags`, `TrackWithTags`, `ThemeProvider`, `app.tsx`)
- **BREAKING** Remove playlist generation pipeline (`SpotifyService`, `PromptService`, `TagService`)
- **BREAKING** Remove `cli.tsx` entry point; replace with an Express HTTP server entry point
- Add Express server with REST API for playback control
- Add Server-Sent Events (SSE) endpoint for real-time now-playing status
- Add mobile-first web UI (mood grid + now-playing strip) served by the Express server
- Add `Containerfile` for Podman deployment with secrets/env-file support for credentials
- Retain `DiscordService`, `YouTubeService`, `PlaylistService` unchanged
- Playlist JSON format unchanged; each file's `name` field becomes the mood button label

## Capabilities

### New Capabilities

- `http-server`: Express server that manages the persistent Discord bot connection and exposes REST + SSE endpoints for the browser UI
- `soundboard-ui`: Mobile-first browser UI — grid of mood buttons, now-playing strip, playback controls (pause, resume, skip)
- `container-deployment`: Podman `Containerfile` + secrets/env-file handling for `DISCORD_TOKEN` and `DISCORD_VOICE_CHANNEL_ID`; no Spotify or Last.fm credentials required

### Modified Capabilities

## Impact

- Removes `ink`, `ink-select-input`, `ink-text-input`, `clipboardy`, `spotify-web-api-node`, `node-fetch` dependencies
- Adds `express` dependency
- `DISCORD_TOKEN` and `DISCORD_VOICE_CHANNEL_ID` remain required; `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `LASTFM_API_KEY` are no longer used
- Playlists directory becomes a Podman volume mount (path configurable via `PLAYLIST_FOLDER`)
- Container must include `yt-dlp` and `ffmpeg` binaries
