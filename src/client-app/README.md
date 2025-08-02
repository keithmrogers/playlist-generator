# Playlist Generator

[![Build Status](https://github.com/keithmrogers/playlist-generator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/keithmrogers/playlist-generator/actions/workflows/ci.yml?branch=initial-app)
[![Coverage Status](https://coveralls.io/repos/github/keithmrogers/playlist-generator/badge.svg?branch=main)](https://coveralls.io/github/keithmrogers/playlist-generator)

## Features
- Health checks: Spotify, Discord, YouTube (yt-dlp), Last.fm tag service, and campaign configuration
- Interactive CLI UI using Ink for an improved user experience
- Search Spotify for tracks via the Spotify Web API
- Tag-based track suggestions via Last.fm
- Save and manage playlists locally as JSON files
- Stream playlists to a Discord voice channel using yt-dlp
- Support for predefined campaigns via JSON configuration

## Prerequisites
- Node.js v16+
- A Spotify Developer account (Client ID & Secret)
- A Discord Bot Token with the bot added to your server
- A Voice Channel ID where the bot can connect
- A Last.fm API Key (for tag suggestions)
- yt-dlp installed and available in your PATH

## Environment Variables
| Variable                 | Description                               |
| ------------------------ | ----------------------------------------- |
| SPOTIFY_CLIENT_ID        | Spotify API Client ID                     |
| SPOTIFY_CLIENT_SECRET    | Spotify API Client Secret                 |
| DISCORD_TOKEN            | Discord Bot Token                         |
| DISCORD_VOICE_CHANNEL_ID | Discord Voice Channel ID                  |
| LASTFM_API_KEY           | Last.fm API Key for tag suggestions       |
| YTDLP_PATH               | Optional: Path to yt-dlp executable       |

## Configuration
Copy `config/campaign.json.example` to `config/campaign.json` and update campaigns as needed.

## Installation
```sh
npm install
```

## Commands
| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| npm start             | Run the CLI application                      |
| npm run dev           | Run in development mode with live reload     |
| npm test              | Run unit tests                               |
| npm run test:e2e      | Run end-to-end tests                         |
| npm run build         | Compile TypeScript sources                   |

## Usage
```sh
npm start
```
Follow the interactive prompts to generate or stream a playlist.

## Samples & Playlists
- Playlist templates are defined in `templates/promptTemplates.json`.
- Saved playlists are stored in the `playlists/` directory and can be reloaded or streamed via the CLI.

## Development
- Clone the repository and run `npm install`.
- Use `npm run dev` for development with live reload.
- Run `npm test` for unit tests and `npm run test:e2e` for end-to-end tests.
- Build the project with `npm run build`.

## License
MIT
