import React, { useState, useRef, useContext } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import path from 'path';
import { CampaignConfig, PromptService, PromptTemplate } from '../services/prompt-service.js';
import { Playlist, PlaylistService } from '../services/playlist-service.js';
import { ThemeContext } from './ThemeProvider.js';

// Initialize prompt service once
const templates: PromptTemplate[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), './templates/promptTemplates.json'), 'utf-8')
);
const campaignConfig: CampaignConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), './config/campaign.json'), 'utf-8')
);
const promptService = new PromptService(templates, campaignConfig);

interface PlaylistMakerProps {
  onDone: () => void;
}

const PlaylistMaker: React.FC<PlaylistMakerProps> = ({ onDone }) => {
  const theme = useContext(ThemeContext);
  const fields = [
    { name: 'numberOfTracks', label: 'Number of tracks?', default: '10' },
    { name: 'moods', label: 'Target moods (comma-separated)?', default: '' },
    { name: 'sceneType', label: 'Scene/encounter type?', default: '' },
    { name: 'tempo', label: 'Tempo (slow, moderate, fast)?', default: 'moderate' },
    { name: 'intensity', label: 'Intensity/energy level?', default: 'medium' },
    { name: 'environment', label: 'Environment/location?', default: '' },
    { name: 'instrumentationFocus', label: 'Instrumentation focus?', default: '' },
    { name: 'narrativeCue', label: 'Narrative cue/purpose?', default: '' },
    { name: 'trackLength', label: 'Track length (short, standard, extended)?', default: 'standard' }
  ];
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState(fields[0]?.default);
  const [values, setValues] = useState<Record<string,string>>({});
  const [promptText, setPromptText] = useState<string>('');
  const [stage, setStage] = useState<'form'|'display'|'input'>('form');
  const jsonBuffer = useRef<string>('');
  // State for displaying buffer content
  const [displayBuffer, setDisplayBuffer] = useState<string>('');

  useInput((input, key) => {
    if (stage === 'display') {
      setStage('input');
    } else if (stage === 'input') {
      if (key.return) {
        handleSubmitJson(jsonBuffer.current);
        jsonBuffer.current = ''; // clear buffer
        setDisplayBuffer('');
      } else {
        jsonBuffer.current += input;
        setDisplayBuffer(jsonBuffer.current);
      }
    }
  });

  const handleSubmitForm = async () => {
    const field = fields[index]!;
    setValues(prev => ({ ...prev, [field.name]: input || field.default || '' }));
    if (index < fields.length - 1) {
      const next = index + 1;
      setIndex(next);
      setInput(fields[next]?.default);
    } else {
      // generate prompt: calculate searchCount = 2 * numberOfTracks
      const vars = Object.fromEntries(Object.entries(values).concat([[field.name, input || '']]));
      const numTracks = parseInt(vars['numberOfTracks']!);
      const searchCount = numTracks * 3.5; // 3.5x to account for scrubbing
      const promptVars = { ...vars, searchCount, numberOfTracks: vars['numberOfTracks']! };
      const p = await promptService.getPrompt('campaign_playlist', promptVars);
      setPromptText(p);
      setStage('display');
    }
  };

  const handleSubmitJson = async (json: string) => {
    let playlist: Playlist;
    try { playlist = JSON.parse(json) as Playlist; } catch (err) {
      console.error('Invalid JSON'); return;
    }
    if (!playlist.name || !Array.isArray(playlist.tracks)) {
      console.error('JSON must have name and tracks'); return;
    }
    const playlistsDir = path.join(process.cwd(), 'playlists');
    const ps = new PlaylistService(playlistsDir);
    try {
      const spotifyService = new (await import('../services/spotify-service.js')).SpotifyService(
        process.env['SPOTIFY_CLIENT_ID']!, process.env['SPOTIFY_CLIENT_SECRET']!
      );
      // use numberOfTracks as max after scrubbing
      const maxTracks = parseInt(values['numberOfTracks']!);
      const scrubbed = await spotifyService.scrubPlaylist(playlist, maxTracks);
      await ps.savePlaylist(scrubbed);
      console.log(`Playlist saved: ${scrubbed.name}`);
    } catch (err) {
      console.error('Error scrubbing playlist:', err);
      return;
    }
    onDone();
  };

  return (
    <Box flexDirection="column">
      {stage === 'form' ? (
        <>
          <Box><Text color={theme.accent}>{fields[index]?.label}</Text></Box>
          <TextInput
            value={input || ''}
            onChange={setInput}
            onSubmit={handleSubmitForm}
          />
        </>
      ) : stage === 'display' ? (
        <>
          <Text color={theme.highlight} bold>=== COPY PROMPT TO LLM ===</Text>
          <Box marginY={1}><Text color={theme.textPrimary}>{promptText}</Text></Box>
          <Text color={theme.accent}>Press any key to input playlist JSON</Text>
        </>
      ) : (
        <>
          <Text color={theme.accent}>Paste playlist JSON and press Enter:</Text>
          <Box borderStyle="round" padding={1} flexDirection="column" borderColor={theme.surface}>
            <Text color={theme.textSecondary}>{displayBuffer}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PlaylistMaker;
