import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AzureOpenAIService, AzureOpenAIMessage } from '../../src/services/azure-openai-service.js';

// Mock the AzureOpenAI SDK
jest.mock('openai', () => ({
  AzureOpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

import { AzureOpenAI } from 'openai';

describe('AzureOpenAIService', () => {
  let azureOpenAIService: AzureOpenAIService;
  let mockChatCompletionsCreate: jest.MockedFunction<any>;
  const mockApiKey = 'test-api-key';
  const mockEndpoint = 'https://test.openai.azure.com';
  const mockDeploymentName = 'gpt-35-turbo';

  beforeEach(() => {
    jest.clearAllMocks();
    azureOpenAIService = new AzureOpenAIService(mockApiKey, mockEndpoint, mockDeploymentName);
    mockChatCompletionsCreate = (AzureOpenAI as jest.MockedClass<typeof AzureOpenAI>).mock.instances[0].chat.completions.create as jest.MockedFunction<any>;
  });

  describe('constructor', () => {
    test('should throw error if no API key provided', () => {
      expect(() => new AzureOpenAIService('', mockEndpoint, mockDeploymentName)).toThrow('Azure OpenAI API key is required');
    });

    test('should throw error if no endpoint provided', () => {
      expect(() => new AzureOpenAIService(mockApiKey, '', mockDeploymentName)).toThrow('Azure OpenAI endpoint is required');
    });

    test('should throw error if no deployment name provided', () => {
      expect(() => new AzureOpenAIService(mockApiKey, mockEndpoint, '')).toThrow('Azure OpenAI deployment name is required');
    });

    test('should set custom API version if provided', () => {
      const customApiVersion = '2024-05-01-preview';
      const service = new AzureOpenAIService(mockApiKey, mockEndpoint, mockDeploymentName, customApiVersion);
      expect(service).toBeDefined();
    });
  });

  describe('chat', () => {
    test('should make successful chat request', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-35-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      };

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse);

      const messages: AzureOpenAIMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await azureOpenAIService.chat(messages);
      
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        messages,
        max_tokens: 16384,
        temperature: 0.7,
        top_p: 1,
        model: mockDeploymentName
      });

      expect(result).toBe('Test response');
    });

    test('should handle API error response', async () => {
      const error = new Error('Invalid API key');
      mockChatCompletionsCreate.mockRejectedValueOnce(error);

      const messages: AzureOpenAIMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(azureOpenAIService.chat(messages))
        .rejects.toThrow('Invalid API key');
    });

    test('should handle empty response choices', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-35-turbo',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10
        }
      };

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse);

      const messages: AzureOpenAIMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(azureOpenAIService.chat(messages))
        .rejects.toThrow('No response choices returned from Azure OpenAI');
    });
  });

  describe('generatePlaylist', () => {
    test('should generate playlist with system prompt', async () => {
      const mockPlaylistResponse = JSON.stringify({
        name: 'Test Playlist',
        tags: ['rock', 'classic'],
        tracks: [{
          name: 'Test Song',
          artists: ['Test Artist'],
          uri: '',
          popularity: 0
        }]
      });

      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-35-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: mockPlaylistResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse);

      const prompt = 'Create a rock playlist';
      const result = await azureOpenAIService.generatePlaylist(prompt);
      
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: prompt })
        ]),
        max_tokens: 4000,
        temperature: 0.8,
        top_p: 1,
        model: mockDeploymentName
      });

      expect(result).toBe(mockPlaylistResponse);
    });
  });

  describe('testConnection', () => {
    test('should return true for successful connection', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-35-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'OK'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 1,
          total_tokens: 6
        }
      };

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse);

      const result = await azureOpenAIService.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection', async () => {
      mockChatCompletionsCreate.mockRejectedValueOnce(new Error('Network error'));

      const result = await azureOpenAIService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getDeploymentInfo', () => {
    test('should return deployment information', async () => {
      const info = await azureOpenAIService.getDeploymentInfo();
      expect(info).toEqual({
        deploymentName: mockDeploymentName,
        endpoint: mockEndpoint
      });
    });
  });

  describe('setDeployment', () => {
    test('should update deployment name', () => {
      const newDeployment = 'gpt-4';
      azureOpenAIService.setDeployment(newDeployment);
      expect(azureOpenAIService).toBeDefined();
    });
  });

  describe('setApiVersion', () => {
    test('should update API version', () => {
      const newApiVersion = '2024-05-01-preview';
      azureOpenAIService.setApiVersion(newApiVersion);
      expect(azureOpenAIService).toBeDefined();
    });
  });
});
