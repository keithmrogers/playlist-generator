import React, { useState, useEffect, useContext, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { DiscordService } from '../services/discord-service.js';
import { Track } from '../services/playlist-service.js';
import { YouTubeService } from '../services/youtube-service.js';
import { ThemeContext } from './ThemeProvider.js';

interface StreamPlayerProps {
  tracks: Track[];
  onDone: () => void;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ tracks, onDone }) => {
  // consume global theme colors
  const theme = useContext(ThemeContext);

  // ref to YouTubeService to cancel underlying child process
  typeof YouTubeService;
  const ytServiceRef = useRef<YouTubeService>(new YouTubeService());
  // helper to search YouTube and create an AudioResource
  const fetchResource = async (query: string) => {
    const yt = ytServiceRef.current;
    const video = await yt.search(query);
    if (!video) throw new Error(`No YouTube result for ${query}`);
    const stream = await yt.getAudioStream(video.url);
    return createAudioResource(stream, { metadata: { title: video.title, id: video.id } });
  };
  // fetch an AudioResource for a track by its index
  const getAudioResourceByIndex = (index: number) => {
    const track = tracks[index]!;
    const query = `${track.name} ${track.artists.join(' ')}`;
    return fetchResource(query);
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [discord, setDiscord] = useState<DiscordService | null>(null);
  const [playerState, setPlayerState] = useState<AudioPlayerStatus | undefined>(undefined);
  // track previous playerState to detect real end-of-playback
  const prevPlayerStateRef = useRef<AudioPlayerStatus | undefined>(undefined);

  useEffect(() => {
    let ds: DiscordService | null = null;
    (async () => {
      ds = new DiscordService(process.env['DISCORD_TOKEN']!, process.env['DISCORD_VOICE_CHANNEL_ID']!);
      await ds.init();
      await ds.connectVoice();
      setDiscord(ds);
    })();
    return () => {
      // cleanup DiscordService and YouTubeService
      ds?.destroy();
      ytServiceRef.current.destroy();
    };
  }, []);

  useInput((input) => {
    if (!discord) return;
    const k = input.toLowerCase();
    if (k === 'p') {
      discord.pause();
    }
    if (k === 'r') {
      discord.resume();
    }
    if (k === 's') {
      discord.stop();
    }
  });

  // unified next-track logic: advance only when going from Playing to Idle
  useEffect(() => {
    const prev = prevPlayerStateRef.current;
    if (playerState === AudioPlayerStatus.Idle && prev === AudioPlayerStatus.Playing) {
      if (currentIndex + 1 < tracks.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onDone();
      }
    }
    prevPlayerStateRef.current = playerState;
  }, [playerState]);

  // play current track and move to next on Idle
  useEffect(() => {
    if (!discord) return;
    const playTrack = async () => {
      try {
        const resource = await getAudioResourceByIndex(currentIndex);
        await discord.playResource(resource);
      } catch (err) {
        console.error(`[StreamPlayer] error on track ${currentIndex}:`, err);
      }
    };
    playTrack();
  }, [discord, currentIndex]);

  useEffect(() => {
    // poll DiscordService for playerState and update loading flag
    if (!discord) return;
    const interval = setInterval(() => {
      const state = discord.getPlayerStatus();
      if (state !== playerState) {
        setPlayerState(state);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [discord, playerState]);

  // derive a friendly status message from the player state
  const statusMessage = React.useMemo(() => {
    if (!playerState) return 'Connecting...';
    switch (playerState) {
      case AudioPlayerStatus.Buffering:
        return 'Buffering audio...';
      case AudioPlayerStatus.Playing:
        return '';
      case AudioPlayerStatus.Paused:
        return 'Paused';
      case AudioPlayerStatus.Idle:
        return 'Ready to play';
      default:
        return `Status: ${playerState}`;
    }
  }, [playerState]);

  if (currentIndex < tracks.length) {
    return (
      <Box flexDirection="column">
        {statusMessage && (
          <Text color={theme.accent}>
            {statusMessage}
            {!statusMessage.match(/Buffering|Connecting/) && `: ${tracks[currentIndex]?.name}`}
          </Text>
        )}
        {playerState === AudioPlayerStatus.Playing && (
          <Text color={theme.button}>Controls: (p)ause, (r)esume, (s)kip</Text>
        )}
        <Text color={theme.highlight}>Now playing: {tracks[currentIndex]?.name}</Text>
      </Box>
    );
  }

  return null;
};

export default StreamPlayer;
