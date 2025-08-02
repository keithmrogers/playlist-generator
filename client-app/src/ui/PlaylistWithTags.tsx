import React, { useContext } from 'react';
import { Box, Text } from 'ink';
import TrackWithTags from './TrackWithTags.js';
import { Playlist } from '../services/playlist-service.js';
import { ThemeContext } from './ThemeProvider.js';

interface PlaylistWithTagsProps {
  playlist: Playlist;
  currentIndex?: number;
}

const PlaylistWithTags: React.FC<PlaylistWithTagsProps> = ({ playlist, currentIndex = -1 }) => {
  const theme = useContext(ThemeContext);
  return (
    <Box flexDirection="column" marginTop={1}>
      {/* render playlist name and tags */}
      {playlist.name && (
        <Box>
          <Text color={theme.accent}>{playlist.name}</Text>
          {playlist.tags && playlist.tags.length > 0 && <Text color={theme.highlight}> [{playlist.tags.join(', ')}]</Text>}
        </Box>
      )}
      {playlist.tracks.map((track, idx) => (
        <TrackWithTags
          key={idx}
          track={track}
          prefix={idx === currentIndex ? '▶ ' : '   '}
          isCurrent={idx === currentIndex}
        />
      ))}
    </Box>
  );
};

export default PlaylistWithTags;
