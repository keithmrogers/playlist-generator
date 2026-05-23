## ADDED Requirements

### Requirement: Mode picker shown on first load
The UI SHALL display a full-screen mode picker before the soundboard when no mode has been selected in the current session.

#### Scenario: Fresh page load
- **WHEN** the page loads and no mode is stored in sessionStorage
- **THEN** a mode picker screen is shown with two options: "Local Audio" and "Discord Bot"; the soundboard grid is not visible

#### Scenario: Mode already selected
- **WHEN** the page loads and a mode is stored in sessionStorage
- **THEN** the mode picker is skipped and the soundboard is shown immediately

### Requirement: User selects a mode
The UI SHALL store the chosen mode and transition to the soundboard without a page reload.

#### Scenario: Select Local Audio
- **WHEN** the user taps "Local Audio"
- **THEN** `local` is stored in sessionStorage under the key `playback-mode`, and the soundboard view replaces the mode picker

#### Scenario: Select Discord Bot
- **WHEN** the user taps "Discord Bot"
- **THEN** `discord` is stored in sessionStorage under the key `playback-mode`, and the soundboard view replaces the mode picker

### Requirement: Mode is visible in the soundboard
The UI SHALL indicate the active mode somewhere in the soundboard so the user can confirm which mode is running.

#### Scenario: Mode label displayed
- **WHEN** the soundboard is visible
- **THEN** a small label shows either "Local Audio" or "Discord Bot" indicating the current mode
