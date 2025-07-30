import React, { useState, useRef, useContext } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import { CampaignConfig, PromptService, PromptTemplate } from '../services/prompt-service.js';
import { Playlist, PlaylistService } from '../services/playlist-service.js';
import { TagService } from '../services/tag-service.js';
import TextInput from 'ink-text-input';

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
  const [stage, setStage] = useState<'choose'|'form'|'display'|'input'|'jsonVars'>('choose');
  const jsonBuffer = useRef<string>('');
  // State for displaying buffer content (for playlist JSON and vars)
  const [displayBuffer, setDisplayBuffer] = useState<string>('');
  // State and buffer for JSON vars manual paste handling
  const [displayJsonVarsBuffer, setDisplayJsonVarsBuffer] = useState<string>('');
  const jsonVarsBuffer = useRef<string>('');

  useInput((input, key) => {
    if (stage === 'choose') {
      if (input.toLowerCase() === 'j') setStage('jsonVars');
      else if (input.toLowerCase() === 's') setStage('input');
      else setStage('form');
    } else if (stage === 'jsonVars') {
      if (key.return) {
        handleSubmitVars(jsonVarsBuffer.current);
        jsonVarsBuffer.current = '';
        setDisplayJsonVarsBuffer('');
      } else {
        jsonVarsBuffer.current += input;
        setDisplayJsonVarsBuffer(jsonVarsBuffer.current);
      }
    } else if (stage === 'input') {
      if (key.return) {
        handleSubmitJson(jsonBuffer.current);
        jsonBuffer.current = '';
        setDisplayBuffer('');
      } else {
        jsonBuffer.current += input;
        setDisplayBuffer(jsonBuffer.current);
      }
    } else if (stage === 'display') {
      setStage('input');
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
      const maxTracks = values['numberOfTracks'] ? parseInt(values['numberOfTracks']!) : 12;
      const scrubbed = await spotifyService.scrubPlaylist(playlist, maxTracks);
      // fetch and assign tags on each track
      const tagService = new TagService();
      const tagsMap = await tagService.getTopTagsForTracks(scrubbed.tracks);
      scrubbed.tracks = scrubbed.tracks.map(track => {
        // key off the full Spotify URI
        const key = track.uri ?? '';
        return { ...track, tags: tagsMap[key] || [] };
      });
      await ps.savePlaylist(scrubbed);

    } catch (err) {
      console.error('Error scrubbing playlist:', err);
      return;
    }
    onDone();
  };

  // Handle JSON vars quick-start
  const handleSubmitVars = async (jsonString: string) => {
    let varsObj: Record<string, any>;
    console.log('Parsing JSON vars:', jsonString); 
    JSON.parse(jsonString); 
    try { varsObj = JSON.parse(jsonString); } catch (err) { console.error('Invalid JSON'); return; }
    setValues(varsObj);
    const numTracks = parseInt(varsObj['numberOfTracks'] || values['numberOfTracks'] || '10');
    const searchCount = numTracks * 3.5;
    const promptVars = { ...varsObj, searchCount, numberOfTracks: (varsObj['numberOfTracks']?.toString()||'10') };
    const p = await promptService.getPrompt('campaign_playlist', promptVars);
    setPromptText(p);
    setStage('display');
  };

  return (
    <Box flexDirection="column">
      {stage === 'choose' ? (
        <>
          <Text color={theme.accent}>Press 'j' to input JSON variables for quick playlist making, 's' to skip to pasting JSON, or any other key for interactive mode</Text>
        </>
      ) : stage === 'jsonVars' ? (
        <>
          <Text color={theme.accent}>Paste JSON variables and press Enter:</Text>
          <Box borderStyle="round" padding={1} flexDirection="column" borderColor={theme.surface}>
            <Text>{displayJsonVarsBuffer}</Text>
          </Box>
        </>
      ) : stage === 'form' ? (
        <>
          <Text color={theme.accent}>{fields[index]?.label} (default: {fields[index]?.default}):</Text>
          <TextInput
            value={input || ''}
            onChange={setInput}
            onSubmit={handleSubmitForm}
          />
        </>
      ) : stage === 'display' ? (
        <>
          <Text bold color={theme.highlight}>=== COPY PROMPT TO LLM ===</Text>
          <Box marginY={1} borderStyle="round" padding={1} flexDirection="column">
            <Text color={theme.textPrimary}>{promptText}</Text>
          </Box>
          <Text color={theme.accent}>Press any key to paste JSON playlist</Text>
        </>
      ) : stage === 'input' ? (
        <>
          <Text color={theme.accent}>Paste playlist JSON and press Enter:</Text>
          <Box borderStyle="round" padding={1} flexDirection="column" borderColor={theme.surface}>
            <Text color={theme.textSecondary}>{displayBuffer}</Text>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default PlaylistMaker;
