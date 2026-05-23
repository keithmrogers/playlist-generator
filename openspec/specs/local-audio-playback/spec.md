## ADDED Requirements

### Requirement: Server streams track audio over HTTP
The server SHALL expose `GET /stream/:name` that pipes yt-dlp audio output for the named playlist's current track as a chunked HTTP response.

#### Scenario: Valid playlist name
- **WHEN** `GET /stream/:name` is requested with a known playlist name
- **THEN** the server responds with `Content-Type: audio/webm`, status 200, and streams audio data until the track ends or the connection closes

#### Scenario: Unknown playlist name
- **WHEN** `GET /stream/:name` is requested with an unknown playlist name
- **THEN** the server responds with status 404

#### Scenario: New stream requested while one is active
- **WHEN** a `/stream/:name` request arrives while a previous stream process is running
- **THEN** the previous yt-dlp process is killed and a new stream begins for the new request

### Requirement: Browser plays audio via native audio element in Local Audio mode
In Local Audio mode, the UI SHALL use an `<audio>` element pointed at `/stream/:name` rather than calling `/play/:name`.

#### Scenario: Tap mood button in Local Audio mode
- **WHEN** the user taps a mood button and the active mode is Local Audio
- **THEN** the browser sets the `<audio>` element's `src` to `/stream/:name` and calls `.play()`; no request is sent to `/play/:name`

#### Scenario: Tap mood button in Discord mode
- **WHEN** the user taps a mood button and the active mode is Discord
- **THEN** `POST /play/:name` is sent as before; the `<audio>` element is not used

### Requirement: Playback controls adapt to Local Audio mode
In Local Audio mode, pause and resume SHALL use the browser's native audio API; skip SHALL request a new stream for the same playlist.

#### Scenario: Pause in Local Audio mode
- **WHEN** the user taps Pause and the active mode is Local Audio
- **THEN** `audio.pause()` is called; no request is sent to `/pause`

#### Scenario: Resume in Local Audio mode
- **WHEN** the user taps Resume and the active mode is Local Audio
- **THEN** `audio.play()` is called; no request is sent to `/resume`

#### Scenario: Skip in Local Audio mode
- **WHEN** the user taps Skip and the active mode is Local Audio
- **THEN** `POST /skip` is sent to advance the server's track index, then the `<audio>` src is refreshed to `/stream/:name` to start the next track
