## ADDED Requirements

### Requirement: Server initialises persistent Discord connection on startup
The server SHALL connect the Discord bot to the configured voice channel at startup and maintain that connection for the lifetime of the process.

#### Scenario: Successful startup
- **WHEN** the server process starts with valid `DISCORD_TOKEN` and `DISCORD_VOICE_CHANNEL_ID` env vars
- **THEN** the Discord bot connects to the voice channel and the HTTP server begins accepting requests

#### Scenario: Missing env vars
- **WHEN** either `DISCORD_TOKEN` or `DISCORD_VOICE_CHANNEL_ID` is absent
- **THEN** the process logs a clear error message and exits with a non-zero code before binding the port

### Requirement: List playlists endpoint
The server SHALL expose `GET /playlists` returning a JSON array of available playlists.

#### Scenario: Playlists exist
- **WHEN** the playlists directory contains one or more valid JSON playlist files
- **THEN** the response is `200` with a JSON array of objects each containing at minimum `name` (string) and `trackCount` (number)

#### Scenario: Empty playlists directory
- **WHEN** the playlists directory is empty or contains no valid playlist files
- **THEN** the response is `200` with an empty JSON array

### Requirement: Play playlist endpoint
The server SHALL expose `POST /play/:name` to start playing a named playlist.

#### Scenario: Valid playlist name
- **WHEN** a `POST /play/:name` request is received and a playlist with that name exists
- **THEN** the currently playing audio (if any) is stopped immediately, the target playlist's tracks are shuffled, and playback begins from the first track; response is `200`

#### Scenario: Unknown playlist name
- **WHEN** a `POST /play/:name` request is received and no matching playlist exists
- **THEN** the response is `404` with a JSON error body; current playback is unaffected

#### Scenario: Switch mid-song
- **WHEN** a `POST /play/:name` request is received while a track is currently playing
- **THEN** the current track cuts immediately (no fade) and the new playlist starts

### Requirement: Playback control endpoints
The server SHALL expose `POST /pause`, `POST /resume`, and `POST /skip` for player control.

#### Scenario: Pause while playing
- **WHEN** `POST /pause` is received and a track is playing
- **THEN** playback pauses and response is `200`

#### Scenario: Resume while paused
- **WHEN** `POST /resume` is received and playback is paused
- **THEN** playback resumes and response is `200`

#### Scenario: Skip current track
- **WHEN** `POST /skip` is received
- **THEN** the current track stops and the next track in the shuffled queue begins; if on the last track, the playlist wraps to track 0

#### Scenario: Control with no active playlist
- **WHEN** any control endpoint is called and no playlist is loaded
- **THEN** the response is `409` with a JSON error body

### Requirement: SSE now-playing status stream
The server SHALL expose `GET /status` as a Server-Sent Events stream that pushes state updates to connected clients.

#### Scenario: Client connects
- **WHEN** a browser connects to `GET /status`
- **THEN** the server immediately sends the current player state (playlist name, track name, artists, player status, track index, total tracks)

#### Scenario: State changes
- **WHEN** the player state changes (track advance, pause, resume, stop)
- **THEN** all connected SSE clients receive an updated state event within 500ms

#### Scenario: Client disconnects
- **WHEN** a browser closes or navigates away
- **THEN** the server cleans up the SSE connection without error

### Requirement: Static frontend serving
The server SHALL serve the web UI static files from `src/public/` at the root path.

#### Scenario: Root request
- **WHEN** a browser requests `GET /`
- **THEN** the server responds with `src/public/index.html`

### Requirement: Graceful shutdown
The server SHALL handle `SIGTERM` by stopping playback and destroying the Discord connection before exiting.

#### Scenario: SIGTERM received
- **WHEN** the process receives `SIGTERM` (e.g., `podman stop`)
- **THEN** the Discord voice connection is destroyed, the HTTP server stops accepting new connections, and the process exits cleanly
