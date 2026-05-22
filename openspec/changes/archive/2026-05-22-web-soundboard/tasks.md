## 1. Cleanup — Remove Generation Pipeline

- [x] 1.1 Delete `src/ui/` directory (all Ink components)
- [x] 1.2 Delete `src/services/spotify-service.ts`
- [x] 1.3 Delete `src/services/prompt-service.ts`
- [x] 1.4 Delete `src/services/tag-service.ts`
- [x] 1.5 Delete `src/cli.tsx` entry point
- [x] 1.6 Remove unused dependencies from `package.json`: `ink`, `ink-select-input`, `ink-text-input`, `clipboardy`, `spotify-web-api-node`, `node-fetch` and their `@types/*` counterparts
- [x] 1.7 Remove unused env var references (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `LASTFM_API_KEY`) from `health-service.ts` and `config.ts`

## 2. Server Entry Point

- [x] 2.1 Add `express` and `@types/express` to `package.json`
- [x] 2.2 Create `src/server.ts`: initialise `DiscordService`, mount Express routes, listen on `PORT` (default 3000)
- [x] 2.3 Implement startup validation — exit with clear error if `DISCORD_TOKEN` or `DISCORD_VOICE_CHANNEL_ID` are missing
- [x] 2.4 Register `SIGTERM` handler that destroys Discord connection and closes HTTP server cleanly
- [x] 2.5 Update `package.json` `main`/`bin` and `start` script to point to `dist/server.js`

## 3. REST API Routes

- [x] 3.1 Implement `GET /playlists` — read playlist directory, return `[{ name, trackCount }]`
- [x] 3.2 Implement `POST /play/:name` — stop current audio, shuffle target playlist, start playback from track 0; return 404 if not found
- [x] 3.3 Implement `POST /pause` — delegate to `DiscordService.pause()`; return 409 if no active playlist
- [x] 3.4 Implement `POST /resume` — delegate to `DiscordService.resume()`; return 409 if no active playlist
- [x] 3.5 Implement `POST /skip` — advance to next track (wrap to 0 at end); return 409 if no active playlist
- [x] 3.6 Implement `GET /status` SSE endpoint — send current state on connect; push updates on every player state change

## 4. Playback State Manager

- [x] 4.1 Create a `PlaybackState` module (or class) that tracks: active playlist name, shuffled track list, current index, player status
- [x] 4.2 Wire `PlaybackState` into the SSE broadcaster so all connected clients receive updates within 500ms of any state change
- [x] 4.3 Implement Fisher-Yates shuffle used when a playlist is loaded via `POST /play/:name`
- [x] 4.4 Implement auto-advance: when the Discord player reaches Idle after Playing, advance to next track (or wrap)

## 5. Web UI

- [x] 5.1 Create `src/public/index.html` — shell with mood grid and pinned now-playing strip
- [x] 5.2 Create `src/public/style.css` — mobile-first layout: 2-column grid on narrow viewports, now-playing strip pinned to bottom, min 64px button height
- [x] 5.3 Create `src/public/app.js` — fetch `/playlists` on load, render mood buttons, connect to `/status` SSE, wire up button taps and playback controls
- [x] 5.4 Highlight the active mood button based on SSE state; clear highlight when nothing is playing
- [x] 5.5 Display track name, artist(s), index/total, and playlist name in the now-playing strip
- [x] 5.6 Show idle message in now-playing strip when no playlist is loaded

## 6. Container

- [x] 6.1 Write `Containerfile`: Node LTS base, install yt-dlp + ffmpeg, copy app, run `npm ci --omit=dev`, set entrypoint to `node dist/server.js`
- [x] 6.2 Add `.dockerignore` / `.containerignore` to exclude `node_modules`, `openspec`, `src/` (post-build), and any `.env` files
- [x] 6.3 Write `.env.example` documenting `DISCORD_TOKEN`, `DISCORD_VOICE_CHANNEL_ID`, `PORT` (optional), `PLAYLIST_FOLDER` (optional)
- [x] 6.4 Document both run methods in `README.md`: env file (`--env-file .env`) and Podman secrets (`--secret`)
- [x] 6.5 Document volume mount for playlists directory and port mapping in `README.md`

## 7. Validation

- [ ] 7.1 Build the image with `podman build` and confirm it starts cleanly with valid env vars
- [ ] 7.2 Confirm `podman stop` exits within 10 seconds (SIGTERM handled correctly)
- [ ] 7.3 Smoke test mood switching: tap two different playlists rapidly, confirm clean cut with no audio overlap
- [ ] 7.4 Verify SSE updates now-playing strip on track advance without page refresh
- [ ] 7.5 Test on a phone browser — confirm layout, button tap targets, and bottom strip usability
- [x] 7.6 Update `CLAUDE.md` with new build/run commands and revised architecture
