import SpotifyWebApi from 'spotify-web-api-node';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { DiscordService } from './services/discord-service';
import { createAudioResource } from '@discordjs/voice';
import { YouTubeService } from './services/youtube-service';
import { PromptService, PromptTemplate, CampaignConfig } from './services/prompt-service';

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

// load prompt templates and campaign config
const templates: PromptTemplate[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../templates/promptTemplates.json'), 'utf-8')
);
const campaignConfig: CampaignConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config/campaign.json'), 'utf-8')
);
const promptService = new PromptService(templates, campaignConfig);

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

async function createPlaylistViaLLM(): Promise<void> {
  // prompt for dynamic values (with optional defaults)
  const { numberOfTracks, moods, sceneType, tempo, intensity, environment, instrumentationFocus, narrativeCue, trackLength } = await inquirer.prompt<{
    numberOfTracks: number;
    moods: string;
    sceneType: string;
    tempo: string;
    intensity: string;
    environment: string;
    instrumentationFocus: string;
    narrativeCue: string;
    trackLength: string;
  }>([
    { type: 'number', name: 'numberOfTracks', message: 'Number of tracks?', default: 10 },
    { type: 'input', name: 'moods', message: 'Target moods (comma-separated)?', default: '' },
    { type: 'input', name: 'sceneType', message: 'Scene/encounter type (e.g. battle, exploration)?', default: '' },
    { type: 'input', name: 'tempo', message: 'Tempo (slow, moderate, fast)?', default: 'moderate' },
    { type: 'input', name: 'intensity', message: 'Intensity/energy level (low, medium, high)?', default: 'medium' },
    { type: 'input', name: 'environment', message: 'Environment/location (forest, dungeon)?', default: '' },
    { type: 'input', name: 'instrumentationFocus', message: 'Instrumentation focus (strings, percussion)?', default: '' },
    { type: 'input', name: 'narrativeCue', message: 'Narrative cue/purpose (build tension, triumph)?', default: '' },
    { type: 'input', name: 'trackLength', message: 'Track length (short, standard, extended)?', default: 'standard' }
  ]);
  // build and display the LLM prompt
  const prompt = await promptService.getPrompt('campaign_playlist', { numberOfTracks, moods, sceneType, tempo, intensity, environment, instrumentationFocus, narrativeCue, trackLength });
  console.log(`\n=== COPY THIS PROMPT TO YOUR LLM ===\n${prompt}\n`);
  // wait for user to paste the JSON output
  const { llmOutput } = await inquirer.prompt<{ llmOutput: string }>([
    {
      type: 'editor',
      name: 'llmOutput',
      message: 'After running the prompt in your LLM, paste the returned JSON here'  
    }
  ]);
  let playlist: Playlist;
  try {
    playlist = JSON.parse(llmOutput.trim()) as Playlist;
  } catch (err) {
    console.error('Failed to parse JSON from LLM:', err);
    return;
  }
  // save the playlist JSON to file
  const filename = `${playlist.name.replace(/[\\/]/g, '_')}.json`;
  const filePath = path.join(__dirname, '../playlists', filename);
  fs.writeFileSync(filePath, JSON.stringify(playlist, null, 2), 'utf-8');
  console.log(`Playlist saved to ${filePath}`);
}

export async function status(): Promise<void> {
  console.log('Checking Spotify...');
  try {
    await authorizeSpotify();
    console.log('Spotify: OK');
  } catch (err) {
    console.error('Spotify: ERROR', err);
  }
  console.log('Checking Discord...');
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_VOICE_CHANNEL_ID) {
    const discord = new DiscordService(process.env.DISCORD_TOKEN, process.env.DISCORD_VOICE_CHANNEL_ID);
    try {
      await discord.init();
      const { clientReady, voiceConnected } = discord.healthCheck();
      if (clientReady && voiceConnected) {
        console.log('Discord: OK');
      } else {
        console.error('Discord: ERROR', { clientReady, voiceConnected });
      }
    } catch (err) {
      console.error('Discord: ERROR during init', err);
    } finally {
      discord.destroy();
    }
  } else {
    console.error('Discord: ERROR Missing DISCORD_TOKEN or DISCORD_VOICE_CHANNEL_ID');
  }
  console.log('Checking playlists directory...');
  try {
    fs.accessSync(path.join(__dirname, '../playlists'));
    console.log('Playlists directory: OK');
  } catch (err) {
    console.error('Playlists directory: ERROR', err);
  }
}

// CLI entry point: handle "status" command
if (process.argv[2] === 'status') {
  status()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  async function main(): Promise<void> {
     await authorizeSpotify();
     let running = true;
     while (running) {
       const { action } = await inquirer.prompt<{ action: string }>({
         type: 'list', name: 'action', message: 'Choose an action:',
         choices: [
           { name: 'Generate a playlist via LLM', value: 'llm' },
           { name: 'Stream a playlist to Discord', value: 'stream' },
           { name: 'Exit', value: 'exit' }
         ]
       });
       switch (action) {
         case 'llm':
           await createPlaylistViaLLM();
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
}
