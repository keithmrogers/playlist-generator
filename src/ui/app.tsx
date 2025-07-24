import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'fs';
import path from 'path';
import TextInput from 'ink-text-input';
import { useInput } from 'ink';
import { CampaignConfig, PromptService, PromptTemplate } from '../services/prompt-service.js';
import { Playlist, Track } from '../services/playlist-service.js';
import StreamPlayer from './stream-player.js';

// Initialize prompt service once for both components
const templates: PromptTemplate[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), './templates/promptTemplates.json'), 'utf-8')
);
const campaignConfig: CampaignConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), './config/campaign.json'), 'utf-8')
);
const promptService = new PromptService(templates, campaignConfig);

// Define menu item type
type MenuItem = { label: string; value: 'llm' | 'stream' | 'exit' };

// Component to stream playlists using Ink for selection
const StreamPlaylistInk: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const files = fs.readdirSync(path.join(process.cwd(), 'playlists')).filter(f => f.endsWith('.json'));
  if (!files.length) {
    return <Box><Text>No local playlists found. Press any key to return.</Text></Box>;
  }
  const [selectedTracks, setSelectedTracks] = useState<Track[] | null>(null);
  const items = files.map(f => ({ label: f, value: f }));
  const handleSelectFile = (item: { label: string; value: string }) => {
    const playlist: Playlist = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'playlists', item.value), 'utf-8')
    );
    setSelectedTracks(playlist.tracks);
  };
  if (selectedTracks) {
    return <StreamPlayer tracks={selectedTracks} onDone={onDone} />;
  }
  return (
    <Box flexDirection="column">
      <Text>Select a playlist to stream:</Text>
      <SelectInput items={items} onSelect={handleSelectFile} />
    </Box>
  );
};

// Component to create playlist via LLM using Ink inputs
const CreatePlaylistInk: React.FC<{ onDone: () => void }> = ({ onDone }) => {
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
  const [stage, setStage] = useState<'form'|'display'>('form');

  useInput((_: string, _key: any) => {
    if (stage === 'display') onDone();
  });

  const handleSubmit = async () => {
    const field = fields[index]!;
    setValues(prev => ({ ...prev, [field.name]: input || '' }));
    if (index < fields.length - 1) {
      const next = index + 1;
      setIndex(next);
      setInput(fields[next]?.default);
    } else {
      // all fields collected, generate prompt
      const vars = Object.fromEntries(Object.entries(values).concat([[fields[index]!.name, input || '']]));
      const prompt = await promptService.getPrompt('campaign_playlist', vars);
      setPromptText(prompt);
      setStage('display');
    }
  };

  return (
    <Box flexDirection="column">
      {stage === 'form' ? (
        <>
          <Box><Text>{fields[index]?.label}</Text></Box>
          <TextInput value={input || ''} onChange={setInput} onSubmit={handleSubmit} />
        </>
      ) : (
        <>
          <Text bold>=== COPY THIS PROMPT TO YOUR LLM ===</Text>
          <Box marginY={1}><Text>{promptText}</Text></Box>
          <Text>Press any key to return.</Text>
        </>
      )}
    </Box>
  );
};

const App: React.FC = () => {
  const { exit } = useApp();
  const [mode, setMode] = useState<'menu'|'stream'|'llm'>('menu');
  // Route modes
  if (mode === 'stream') return <StreamPlaylistInk onDone={() => setMode('menu')} />;
  if (mode === 'llm') return <CreatePlaylistInk onDone={() => setMode('menu')} />;

  const items: MenuItem[] = [
    { label: 'Generate playlist via LLM', value: 'llm' },
    { label: 'Stream playlist to Discord', value: 'stream' },
    { label: 'Exit', value: 'exit' }
  ];
  

  const handleSelect = async (item: MenuItem) => {
     switch (item.value) {
      case 'llm': return setMode('llm');
      case 'stream': return setMode('stream');
       case 'exit':
         exit();
         return;
     }
   };

   return (
    <Box flexDirection="column">
      <Text>Select an action:</Text>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};

export default App;