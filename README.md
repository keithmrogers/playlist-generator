# Playlist Generator

A local Node.js CLI application that generates playlists based on Spotify searches and streams audio to a Discord voice channel using YouTube audio streams.

## Features

- Search Spotify for tracks via the Spotify Web API
- Save playlists locally as JSON files
- Stream playlists to a Discord voice channel using ytdl-core

## Prerequisites

- Node.js v16+
- A Spotify Developer account (Client ID & Secret)
- A Discord Bot Token with the bot added to your server
- A Voice Channel ID where the bot can connect

## Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your credentials.

## Usage

```sh
npm start
```

Follow the interactive prompts to create and optionally stream a playlist.
