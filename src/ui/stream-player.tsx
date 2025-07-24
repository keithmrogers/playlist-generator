import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { createAudioResource } from '@discordjs/voice';
import { DiscordService } from '../services/discord-service.js';
import { Track } from '../services/playlist-service.js';
import { YouTubeService } from '../services/youtube-service.js';

interface StreamPlayerProps {
  tracks: Track[];
  onDone: () => void;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ tracks, onDone }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [discord, setDiscord] = useState<DiscordService | null>(null);

  useEffect(() => {
    console.log('[StreamPlayer] mounting, initializing Discord connection');
    const init = async () => {
      console.log('[StreamPlayer] calling DiscordService.init()');
      const ds = new DiscordService(process.env['DISCORD_TOKEN']!, process.env['DISCORD_VOICE_CHANNEL_ID']!);
      await ds.init();
      console.log('[StreamPlayer] Discord connected');
      setDiscord(ds);
    };
    init();
    return () => {
      console.log('[StreamPlayer] unmounting, destroying Discord connection');
      discord?.destroy();
    };
  }, []);

  useInput((input) => {
    console.log(`[StreamPlayer] key input: ${input}`);
    if (!discord) return;
    const k = input.toLowerCase();
    if (k === 'p') {
      console.log('[StreamPlayer] pause command');
      discord.pause();
    }
    if (k === 'r') {
      console.log('[StreamPlayer] resume command');
      discord.resume();
    }
    if (k === 's') {
      console.log('[StreamPlayer] skip command');
      discord.stop();
    }
  });

  useEffect(() => {
    if (!discord) return;
    let cancelled = false;
    const runPlayback = async () => {
      console.log('[StreamPlayer] start playback loop');
      for (let i = 0; i < tracks.length; i++) {
        if (cancelled) break;
        setCurrentIndex(i);
        setElapsed(0);
        const track = tracks[i]!;
        console.log(`[StreamPlayer] playing track ${i}: ${track.name}`);
        try {
          const yt = new YouTubeService();
          const video = await yt.search(`${track.name} ${track.artists.join(' ')}`);
          console.log(`[StreamPlayer] YouTube result: ${video?.title}`);
          if (video) {
            const stream = await yt.getAudioStream(video.url);
            const resource = createAudioResource(stream);
            console.log('[StreamPlayer] playing audio resource');
            await discord.playResource(resource);
            console.log(`[StreamPlayer] finished track ${i}`);
          }
        } catch (err) {
          console.error(`[StreamPlayer] error on track ${i}:`, err);
        }
      }
      if (!cancelled) {
        console.log('[StreamPlayer] playback complete, calling onDone');
        onDone();
      }
    };
    runPlayback();
    return () => { cancelled = true; };
  }, [discord]);

  if (currentIndex < tracks.length) {
    return (
      <Box flexDirection="column">
        <Text>Controls: (p)ause, (r)esume, (s)kip</Text>
        <Text>Now playing: {tracks[currentIndex]?.name}</Text>
        <Text>Elapsed: {elapsed}s</Text>
      </Box>
    );
  }

  return null;
};

export default StreamPlayer;
