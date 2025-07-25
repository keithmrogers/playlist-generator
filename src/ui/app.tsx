import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import PlaylistPicker from './PlaylistPicker.js';
import PlaylistMaker from './PlaylistMaker.js';

// StreamPlaylistInk and CreatePlaylistInk handle UI flows

// Define menu item type
type MenuItem = { label: string; value: 'llm' | 'stream' | 'exit' };

// Component to stream playlists using Ink for selection
const App: React.FC = () => {
  const { exit } = useApp();
  const [mode, setMode] = useState<'menu'|'stream'|'llm'>('menu');
  // Route modes
  if (mode === 'stream') return <PlaylistPicker onDone={() => setMode('menu')} />;
  if (mode === 'llm') return <PlaylistMaker onDone={() => setMode('menu')} />;

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
}

export default App;