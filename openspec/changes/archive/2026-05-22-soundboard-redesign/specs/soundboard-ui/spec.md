## MODIFIED Requirements

### Requirement: Mood grid displays four fixed mood buttons
The UI SHALL display exactly four fixed mood buttons — Ambient, Action, Foreboding, Triumphant — arranged in a 2×2 grid, regardless of what playlist files exist on disk.

#### Scenario: Page loaded with mode selected
- **WHEN** the soundboard view is shown after mode selection
- **THEN** four large buttons are displayed: Ambient, Action, Foreboding, Triumphant; no dynamic loading from `/playlists` is required to render the grid

#### Scenario: Missing playlist file
- **WHEN** a mood button is tapped but no playlist JSON with a matching `name` exists on disk
- **THEN** the server returns an error and the UI shows a brief error state on that button (e.g., red flash); the button does not disappear

## REMOVED Requirements

### Requirement: Mood grid displays all available playlists
**Reason**: Replaced by four fixed mood buttons. The dynamic grid that loaded all playlist files and rendered one button per file is no longer needed.
**Migration**: Name playlist JSON files with `name` fields matching one of the four moods: Ambient, Action, Foreboding, Triumphant.
