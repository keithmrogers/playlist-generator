import React, { useState, useContext } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import PlaylistPicker from './PlaylistPicker.js';
import PlaylistMaker from './PlaylistMaker.js';
import { ThemeProvider, ThemeContext } from './ThemeProvider.js';

// StreamPlaylistInk and CreatePlaylistInk handle UI flows

// Define menu item type
type MenuItem = { label: string; value: 'llm' | 'stream' | 'exit' };

// Component to stream playlists using Ink for selection
const App: React.FC = () => {
  const theme = useContext(ThemeContext);
  const { exit } = useApp();
  const [mode, setMode] = useState<'menu'|'stream'|'llm'>('menu');
  // Route modes
  if (mode === 'stream') return (
    <ThemeProvider>
      <PlaylistPicker onDone={() => setMode('menu')} />
    </ThemeProvider>
  );
  if (mode === 'llm') return (
    <ThemeProvider>
      <PlaylistMaker onDone={() => setMode('menu')} />
    </ThemeProvider>
  );

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
  // Custom renderer to apply theme to menu items
  const MenuItemComponent: React.FC<{label: string; isSelected?: boolean}> = ({ label, isSelected }) => {
    const theme = useContext(ThemeContext);
    const color = isSelected ? theme.success : theme.textPrimary;
    return <Text color={color}>{label}</Text>;
  };

   return (
    <ThemeProvider>
      <Box flexDirection="column">
        <Text color={theme.accent}>Select an action:</Text>
        <SelectInput items={items} onSelect={handleSelect} itemComponent={MenuItemComponent} />
      </Box>
    </ThemeProvider>
  );
}

export default App;