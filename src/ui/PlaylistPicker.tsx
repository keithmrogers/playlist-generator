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
  // Custom renderer that colors playlist name (green when selected) and tags (cyan)
  const PlaylistItem = ({ label, isSelected = false }: { label: string; isSelected?: boolean }) => {
    // split label into name and tags portion
    const idx = label.indexOf(' [');
    const nameStr = idx >= 0 ? label.slice(0, idx) : label;
    const tagStr = idx >= 0 ? label.slice(idx) : '';
    return (
      <Text>
        <Text color={isSelected ? theme.success : theme.textPrimary}>{nameStr}</Text>
        {tagStr && <Text color={theme.highlight}>{tagStr}</Text>}
      </Text>
    );
  };

  const items = files.map((file: string) => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'playlists', file), 'utf-8');
    let name = file.replace(/\.json$/, '');
    let tags: string[] = [];
    try {
      const pl = JSON.parse(raw) as Playlist;
      name = pl.name;
      tags = pl.tags || [];
    } catch {}
    const label = tags.length ? `${name} [${tags.join(', ')}]` : name;
    return { label, value: file };
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
      <Text>Select a playlist to stream:</Text>
      <SelectInput items={items} onSelect={handleSelect} itemComponent={PlaylistItem} />
    </Box>
  );
};

export default PlaylistPicker;
