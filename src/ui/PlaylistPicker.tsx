import React, { useState, useContext } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'fs';
import path from 'path';
import StreamPlayer from './StreamPlayer.js';
import { Playlist, Track } from '../services/playlist-service.js';
import { ThemeContext } from './ThemeProvider.js';

interface PlaylistPickerProps {
  onDone: () => void;
}

const PlaylistPicker: React.FC<PlaylistPickerProps> = ({ onDone }) => {
  const theme = useContext(ThemeContext);
  const files = fs.readdirSync(path.join(process.cwd(), 'playlists')).filter((f: string) => f.endsWith('.json'));
  if (!files.length) {
    useInput(() => onDone());
    return (
      <Box>
        <Text color={theme.textSecondary}>No local playlists found. Press any key to return.</Text>
      </Box>
    );
  }

  const [selectedTracks, setSelectedTracks] = useState<Track[] | null>(null);
  const items = files.map((file: string) => {
    // read playlist to get its true name
    const raw = fs.readFileSync(path.join(process.cwd(), 'playlists', file), 'utf-8');
    let name = file.replace(/\.json$/, '');
    try {
      const pl = JSON.parse(raw) as Playlist;
      name = pl.name;
    } catch {}
    return { label: name, value: file };
  });

  const handleSelect = (item: { label: string; value: string }) => {
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
      <Text color={theme.accent}>Select a playlist to stream:</Text>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};

export default PlaylistPicker;
