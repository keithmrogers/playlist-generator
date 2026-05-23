## 1. Server — Local Audio Streaming

- [x] 1.1 Add `GET /stream/:name` endpoint to `src/server.ts` that resolves the playlist, fetches the current track via `YouTubeService`, and pipes yt-dlp stdout as `audio/webm`
- [x] 1.2 Track the active stream yt-dlp process in server state; kill it when a new `/stream` request arrives
- [x] 1.3 Return 404 when no playlist matching `:name` exists
- [x] 1.4 Add `POST /skip` passthrough behaviour for local mode (advance track index without starting Discord playback)

## 2. Frontend — Mode Picker

- [x] 2.1 Add mode picker markup to `index.html` (full-screen overlay with two buttons: Local Audio, Discord Bot)
- [x] 2.2 Add mode picker styles to `style.css` (full-screen, centered, large tap targets)
- [x] 2.3 Implement mode selection logic in `app.js`: store chosen mode in `sessionStorage` under `playback-mode`, hide picker, show soundboard
- [x] 2.4 On load, skip picker and go straight to soundboard if `sessionStorage` already has a mode
- [x] 2.5 Show active mode label in the soundboard header (e.g., small chip: "Local Audio" or "Discord Bot")

## 3. Frontend — Four Fixed Mood Buttons

- [x] 3.1 Replace dynamic grid rendering in `app.js` with four hardcoded buttons: Ambient, Action, Foreboding, Triumphant
- [x] 3.2 Update `style.css` for 2×2 grid layout with large tap targets (min 120px height)
- [x] 3.3 Remove the `/playlists` fetch call and `loadPlaylists()` function from `app.js`
- [x] 3.4 Add error state style for mood buttons (red flash when server returns an error for that mood)

## 4. Frontend — Mode-Aware Playback Controls

- [x] 4.1 In `app.js`, add a hidden `<audio>` element to `index.html` for local playback
- [x] 4.2 Route tap events based on mode: Local Audio → set `audio.src = /stream/:name` and call `audio.play()`; Discord → `POST /play/:name`
- [x] 4.3 Route pause/resume based on mode: Local Audio → `audio.pause()` / `audio.play()`; Discord → `POST /pause` / `POST /resume`
- [x] 4.4 Route skip based on mode: Local Audio → `POST /skip` then refresh `audio.src`; Discord → `POST /skip` as before
- [x] 4.5 SSE updates from `/status` continue to drive the now-playing strip in both modes

## 5. Tests

- [x] 5.1 Add server test for `GET /stream/:name` — valid playlist returns 200 with audio content type
- [x] 5.2 Add server test for `GET /stream/:name` — unknown playlist returns 404
- [x] 5.3 Add server test that a second `/stream` request kills the first yt-dlp process
