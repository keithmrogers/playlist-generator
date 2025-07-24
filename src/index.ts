import SpotifyWebApi from 'spotify-web-api-node';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { DiscordService } from './services/discord-service';
import { createAudioResource } from '@discordjs/voice';
import { YouTubeService } from './services/youtube-service';

interface Track {
  name: string;
  artists: string[];
  uri: string;
}

interface Playlist {
  name: string;
  tracks: Track[];
}

// Initialize Spotify API (Client Credentials for search only)
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID!,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
});

async function authorizeSpotify(): Promise<void> {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body['access_token']);
}

async function createPlaylistLocal(): Promise<void> {
  const { playlistName } = await inquirer.prompt<{ playlistName: string }>({
    type: 'input',
    name: 'playlistName',
    message: 'Enter a name for the new playlist:'
  });
  const tracks: Track[] = [];

  let adding = true;
  while (adding) {
    const { query } = await inquirer.prompt<{ query: string }>({
      type: 'input', name: 'query', message: 'Search for a track:'
    });

    const result = await spotifyApi.searchTracks(query, { limit: 5 });
    const items = result.body.tracks?.items;
    if (!items?.length) {
      console.log('No tracks found, try again.');
      continue;
    }

    const choices = items.map((t, i) => ({
      name: `${t.name} — ${t.artists.map(a => a.name).join(', ')}`,
      value: i
    }));
    const { index } = await inquirer.prompt<{ index: number }>({
      type: 'list', name: 'index', message: 'Select a track to add:', choices
    });
    const t = items[index];
    tracks.push({ name: t.name, artists: t.artists.map(a => a.name), uri: t.uri });

    const { more } = await inquirer.prompt<{ more: boolean }>({
      type: 'confirm', name: 'more', message: 'Add more tracks?' , default: true
    });
    adding = more;
  }

  // Save locally
  const playlist: Playlist = { name: playlistName, tracks };
  const file = path.join(__dirname, '../playlists', `${playlistName.replace(/[\\/]/g, '_')}.json`);
  fs.writeFileSync(file, JSON.stringify(playlist, null, 2));
  console.log(`Playlist saved to ${file}`);
}

async function streamPlaylist(): Promise<void> {
  const files = fs.readdirSync(path.join(__dirname, '../playlists')).filter(f => f.endsWith('.json'));
  if (!files.length) {
    console.log('No local playlists found. Create one first.');
    return;
  }
  const { file } = await inquirer.prompt<{ file: string }>({
    type: 'list', name: 'file', message: 'Select a playlist to stream:', choices: files
  });
  const playlist: Playlist = JSON.parse(fs.readFileSync(path.join(__dirname, '../playlists', file), 'utf-8'));

  // Setup Discord service
  const discord = new DiscordService(process.env.DISCORD_TOKEN!, process.env.DISCORD_VOICE_CHANNEL_ID!);
  await discord.init();
  const youtube = new YouTubeService();
  for (const track of playlist.tracks) {
    const video = await youtube.search(`${track.name} ${track.artists.join(' ')}`);
    if (!video) {
      console.log(`Cannot find YouTube result for ${track.name}`);
      continue;
    }
    console.log(`Streaming ${track.name} from ${video.title}`);
    const stream = await youtube.getAudioStream(video.url);
    const resource = createAudioResource(stream);
    await discord.playResource(resource);
  }
  discord.destroy();
}

async function main(): Promise<void> {
   await authorizeSpotify();
   let running = true;
   while (running) {
     const { action } = await inquirer.prompt<{ action: string }>({
       type: 'list', name: 'action', message: 'Choose an action:',
       choices: [
         { name: 'Create a new playlist', value: 'create' },
         { name: 'Stream a playlist to Discord', value: 'stream' },
         { name: 'Exit', value: 'exit' }
       ]
     });
     switch (action) {
       case 'create':
         await createPlaylistLocal();
         break;
       case 'stream':
         await streamPlaylist();
         break;
       case 'exit':
         running = false;
         break;
     }
   }
   process.exit(0);
 }

main().catch(err => console.error(err));
