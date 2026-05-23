## Context

The soundboard is a TypeScript/Express server that streams audio to Discord via yt-dlp. The frontend is vanilla JS/CSS served as static files. The existing `PlaybackState` and `DiscordService` handle all playback; there is no concept of playback mode or browser-side audio.

The user runs sessions on a Victorian cyberpunk campaign and wants to play audio either through Discord (remote players) or directly to a local Bluetooth speaker (in-person play). These are mutually exclusive modes chosen once per session at load time.

## Goals / Non-Goals

**Goals:**
- Mode picker screen before the soundboard appears (Local Audio or Discord Bot)
- Four fixed mood buttons replacing the dynamic playlist grid
- Local audio mode: browser plays audio via an `<audio>` element fed by a server streaming endpoint
- Discord mode: unchanged existing behaviour

**Non-Goals:**
- Switching modes mid-session without a page reload
- Volume control
- Simultaneous Local + Discord output
- Any change to how playlists are stored or discovered on disk

## Decisions

### Four hardcoded buttons vs. dynamic grid

The four moods (Ambient, Action, Foreboding, Triumphant) are fixed in the UI rather than loaded from `/playlists`. The server still reads playlist files from disk, but the frontend maps each button to a well-known name. This removes the complexity of the DM seeing a scrambled or partial grid when playlist files are misnamed.

**Alternative considered**: Keep the dynamic grid, just enforce naming by convention. Rejected because it silently degrades — a misnamed file simply doesn't show up, and there's no clear "home base" layout at a glance.

### Local audio: server-side streaming vs. client-side URL passthrough

The server pipes yt-dlp output as a chunked HTTP audio stream (`/stream/:name`) rather than returning a YouTube URL for the browser to fetch directly.

**Alternative considered**: Return the YouTube direct URL and let the browser `<audio>` element fetch it. Rejected because YouTube's CDN URLs are short-lived, IP-bound, and increasingly bot-detected — browser playback of raw YouTube URLs is unreliable.

### Mode stored in sessionStorage, not server state

The chosen mode (local/discord) is stored in the browser's `sessionStorage`. The server is stateless with respect to mode — in Local Audio mode the browser calls `/stream/:name`; in Discord mode it calls `/play/:name`. No server-side session or mode flag needed.

**Alternative considered**: Server-side mode flag toggled by an endpoint. Rejected — adds server state for a purely client-routing concern, and breaks if two browsers are open simultaneously.

### Local audio streaming endpoint

`GET /stream/:name` starts yt-dlp for the named playlist's current track and pipes stdout directly to the HTTP response with `Content-Type: audio/webm`. The browser `<audio>` element consumes this stream. Skip/pause/resume in local mode are handled by the browser's native audio API (pause, currentTime manipulation) rather than server endpoints.

## Risks / Trade-offs

- **yt-dlp stream latency** → First audio may take 2-4s to begin in local mode. Mitigation: show a loading state on the active button.
- **Concurrent stream requests** → If the user taps a new mood before the previous stream closes, two yt-dlp processes run briefly. Mitigation: server tracks and kills the previous stream process on new `/stream` request.
- **Local mode skip/resume divergence** → Local mode skip is browser-native; Discord mode skip calls `/skip`. The UI must hide/show the correct controls per mode.
- **No progress indicator** → Neither mode exposes track progress position. Accepted for now.

## Migration Plan

No migration needed. Existing playlist JSON files continue to work. The four button names (Ambient, Action, Foreboding, Triumphant) must match `name` fields in playlist JSONs — this is a naming convention, not a schema change.
