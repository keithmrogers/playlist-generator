## Why

The soundboard currently assumes Discord-only playback and presents a dynamic grid of whatever playlist files exist — neither fits how the tool is actually used. Sessions need a consistent set of four mood categories (Ambient, Action, Foreboding, Triumphant) and the option to play audio locally through a Bluetooth speaker instead of routing it through the Discord bot.

## What Changes

- On page load, a mode picker lets the user choose **Local Audio** (browser streams audio directly to device/Bluetooth) or **Discord Bot** (existing behaviour)
- The mood grid is replaced with four fixed large buttons: **Ambient**, **Action**, **Foreboding**, **Triumphant**
- A new server endpoint streams yt-dlp audio as an HTTP audio stream for local playback mode
- The now-playing strip and playback controls remain, adapting to whichever mode is active

## Capabilities

### New Capabilities
- `audio-mode-selection`: Mode picker screen shown on load; user chooses Local Audio or Discord Bot before the soundboard appears
- `local-audio-playback`: Server streams track audio as HTTP chunked audio for browser `<audio>` element playback; used in Local Audio mode

### Modified Capabilities
- `soundboard-ui`: Mood grid replaced with four fixed buttons (Ambient, Action, Foreboding, Triumphant); playlist JSON files are expected to use these four names

## Impact

- `src/public/index.html`, `src/public/app.js`, `src/public/style.css` — UI rewrite
- `src/server.ts` — new `/stream/:name` endpoint for local audio
- `src/playback-state.ts` — mode-aware playback (Discord vs local)
- Playlist JSON files must be named/contain `name` matching one of the four categories
- No change to Discord integration when running in Discord mode
