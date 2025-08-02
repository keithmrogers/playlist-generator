import React, { useContext } from 'react';
import { Box, Text } from 'ink';
import { Track } from '../services/playlist-service.js';
import { ThemeContext } from './ThemeProvider.js';

interface TrackWithTagsProps {
  track: Track;
  prefix?: string;
  isCurrent?: boolean;
}

const TrackWithTags: React.FC<TrackWithTagsProps> = ({ track, prefix = '', isCurrent }) => {
  const theme = useContext(ThemeContext);
  // determine colors for track name and artists
  const trackColor = isCurrent ? theme.success : theme.textPrimary;
  return (
    <Box>
      {/* track name */}
      <Text color={trackColor}>
        {prefix}{track.name}
      </Text>
      {/* artists list */}
      <Text color={theme.muted}> {track.artists.join(', ')}</Text>
      {track.tags && track.tags.length > 0 && (
        <Text color={theme.highlight}> [{track.tags.join(', ')}]</Text>
      )}
    </Box>
  );
};

export default TrackWithTags;
