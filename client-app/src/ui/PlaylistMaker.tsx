import React, { useState, useRef, useContext, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import { CampaignConfig, PromptService, PromptTemplate } from '../services/prompt-service.js';
import { Playlist, PlaylistService } from '../services/playlist-service.js';
import { TagService } from '../services/tag-service.js';
import { AzureOpenAIService } from '../services/azure-openai-service.js';
import {ThemeContext} from './ThemeProvider.js';
import { PLAYLIST_FOLDER } from '../config.js';
import { promptTemplates } from '../templates/promptTemplates.js';

// Initialize prompt service once
const templates: PromptTemplate[] = promptTemplates;
const campaignConfig: CampaignConfig = JSON.parse(
  fs.readFileSync(path.join(PLAYLIST_FOLDER, './config/campaign.json'), 'utf-8')
);
const promptService = new PromptService(templates, campaignConfig);

interface PlaylistMakerProps {
  onDone: () => void;
}

const PlaylistMaker: React.FC<PlaylistMakerProps> = ({ onDone }) => {
  const theme = useContext(ThemeContext);
  const [values, setValues] = useState<Record<string,string>>({});
  const [stage, setStage] = useState<'llm'|'processing'|'input'|'jsonVars'>('jsonVars');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [llmResponse, setLlmResponse] = useState<string>('');
  // Automatically process playlist when LLM completes
  useEffect(() => {
    if (stage === 'llm' && llmResponse && !isLoading) {
      validateAndSavePlaylist(llmResponse);
    }
  }, [stage, llmResponse, isLoading]);
  const jsonBuffer = useRef<string>('');
  // State for displaying buffer content (for playlist JSON and vars)
  const [displayBuffer, setDisplayBuffer] = useState<string>('');
  // State and buffer for JSON vars manual paste handling
  const [displayJsonVarsBuffer, setDisplayJsonVarsBuffer] = useState<string>('');
  const jsonVarsBuffer = useRef<string>('');

  useInput((input, key) => {
    if (stage === 'jsonVars') {
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
        validateAndSavePlaylist(jsonBuffer.current);
        jsonBuffer.current = '';
        setDisplayBuffer('');
      } else {
        jsonBuffer.current += input;
        setDisplayBuffer(jsonBuffer.current);
      }
    }
  });

  const validateAndSavePlaylist = async (json: string) => {
    setStage('processing');
    let playlist: Playlist;
    try { playlist = JSON.parse(json) as Playlist; } catch (err) {
      console.error('Invalid JSON'); return;
    }
    if (!playlist.name || !Array.isArray(playlist.tracks)) {
      console.error('JSON must have name and tracks'); return;
    }
    const ps = new PlaylistService(PLAYLIST_FOLDER);
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
    const promptMessages = await promptService.getPromptMessages('campaign_playlist', promptVars);
    
    // Call Azure OpenAI service
    setIsLoading(true);
    setStage('llm');
    try {
      const azureOpenAIService = new AzureOpenAIService(
        process.env['AZURE_OPENAI_API_KEY']!,
        process.env['AZURE_OPENAI_ENDPOINT']!,
        process.env['AZURE_OPENAI_DEPLOYMENT']!
      );
      const response = await azureOpenAIService.generatePlaylist(
        promptMessages.systemMessage,
        promptMessages.userMessage
      );
      setLlmResponse(response);
    } catch (err) {
      console.error('Error calling Azure OpenAI:', err);
      setLlmResponse('Error generating playlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column">
      {stage === 'jsonVars' ? (
        <>
          <Text color={theme.accent}>Paste JSON variables and press Enter:</Text>
          <Box borderStyle="round" padding={1} flexDirection="column" borderColor={theme.surface}>
            <Text>{displayJsonVarsBuffer}</Text>
          </Box>
        </>
      ) : stage === 'llm' ? (
        <>
          {isLoading ? (
            <>
              <Text bold color={theme.highlight}>=== GENERATING PLAYLIST ===</Text>
              <Text color={theme.accent}>Calling Azure OpenAI to generate playlist...</Text>
            </>
          ) : (
            <>
              <Text bold color={theme.highlight}>=== PLAYLIST GENERATED ===</Text>
              <Text color={theme.accent}>Processing and saving playlist...</Text>
            </>
          )}
        </>
      ) : stage === 'processing' ? (
        <>
          <Text bold color={theme.highlight}>=== PROCESSING PLAYLIST ===</Text>
          <Text color={theme.accent}>Scrubbing with Spotify, adding tags, and saving...</Text>
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
