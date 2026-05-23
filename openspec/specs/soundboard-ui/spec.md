## ADDED Requirements

### Requirement: Mood grid displays four fixed mood buttons
The UI SHALL display exactly four fixed mood buttons — Ambient, Action, Foreboding, Triumphant — arranged in a 2×2 grid, regardless of what playlist files exist on disk.

#### Scenario: Page loaded with mode selected
- **WHEN** the soundboard view is shown after mode selection
- **THEN** four large buttons are displayed: Ambient, Action, Foreboding, Triumphant; no dynamic loading from `/playlists` is required to render the grid

#### Scenario: Missing playlist file
- **WHEN** a mood button is tapped but no playlist JSON with a matching `name` exists on disk
- **THEN** the server returns an error and the UI shows a brief error state on that button (e.g., red flash); the button does not disappear

### Requirement: Tapping a mood button switches playback immediately
The UI SHALL send `POST /play/:name` when a mood button is tapped and reflect the active playlist visually.

#### Scenario: Tap a mood button
- **WHEN** the user taps a mood button
- **THEN** `POST /play/:name` is sent, the tapped button becomes visually active (highlighted), and any previously active button is deactivated

#### Scenario: Tap the currently active playlist
- **WHEN** the user taps the button for the playlist that is already playing
- **THEN** `POST /play/:name` is sent (restarting from a reshuffled track 1) and the button remains active

### Requirement: Now-playing strip is always visible
The UI SHALL display a persistent strip at the bottom of the viewport showing the current track and playback controls.

#### Scenario: Track is playing
- **WHEN** a track is playing
- **THEN** the strip shows the track name, artist(s), current track index, total tracks, and the active playlist name

#### Scenario: Nothing playing
- **WHEN** no playlist is loaded
- **THEN** the strip shows an idle message (e.g., "No playlist selected")

### Requirement: Playback controls in now-playing strip
The UI SHALL provide pause, resume, and skip buttons in the now-playing strip.

#### Scenario: Pause
- **WHEN** the user taps Pause while a track is playing
- **THEN** `POST /pause` is sent and the button changes to Resume

#### Scenario: Resume
- **WHEN** the user taps Resume while paused
- **THEN** `POST /resume` is sent and the button changes to Pause

#### Scenario: Skip
- **WHEN** the user taps Skip
- **THEN** `POST /skip` is sent and the now-playing strip updates to the next track

### Requirement: Real-time status via SSE
The UI SHALL connect to `GET /status` and update the now-playing strip and active button state without polling.

#### Scenario: Track advances automatically
- **WHEN** the current track ends and the server advances to the next track
- **THEN** the now-playing strip updates automatically within 500ms, with no user action required

#### Scenario: SSE connection drops
- **WHEN** the SSE connection is lost (network blip, container restart)
- **THEN** the browser attempts to reconnect automatically using the browser's native EventSource reconnect behaviour

### Requirement: Mobile-first responsive layout
The UI SHALL be usable on a phone held in one hand without zooming or horizontal scrolling.

#### Scenario: Phone viewport
- **WHEN** the page is opened on a screen narrower than 480px
- **THEN** mood buttons stack into a 2-column grid, the now-playing strip is pinned to the bottom, and all text is legible without zooming
