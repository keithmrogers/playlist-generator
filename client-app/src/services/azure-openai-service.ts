import { AzureOpenAI } from "openai";

export interface AzureOpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AzureOpenAIChatRequest {
  messages: AzureOpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface AzureOpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AzureOpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export class AzureOpenAIService {
  private apiKey: string;
  private endpoint: string;
  private deployment: string;
  private modelName: string;
  private apiVersion = "2024-04-01-preview";

  constructor(apiKey: string, endpoint: string, deployment: string, apiVersion?: string, modelName?: string) {
    if (!apiKey) {
      throw new Error('Azure OpenAI API key is required');
    }
    if (!endpoint) {
      throw new Error('Azure OpenAI endpoint is required');
    }
    if (!deployment) {
      throw new Error('Azure OpenAI deployment name is required');
    }

    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash if present
    this.deployment = deployment;
    this.modelName = modelName ?? deployment
    if (apiVersion) {
      this.apiVersion = apiVersion;
    }
  }

  /**
   * Send a chat completion request to Azure OpenAI
   */
  async chat(messages: AzureOpenAIMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }): Promise<string> {

    console.log(`AzureOpenAIService: sending chat request with ${messages.length} messages`);


    try {

      const client = new AzureOpenAI({
        endpoint: this.endpoint,
        apiKey: this.apiKey,
        apiVersion: this.apiVersion,
        deployment: this.deployment
      });

      const response = await client.chat.completions.create({
        messages: messages,
        max_tokens: options?.maxTokens ?? 16384,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 1,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        presence_penalty: options?.presencePenalty ?? 0,
        model: this.modelName
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from Azure OpenAI');
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response content from Azure OpenAI');
      }

      console.log(`AzureOpenAIService: received response (${response.usage?.total_tokens || 'unknown'} tokens)`);
      return content.trim();

    } catch (error) {
      console.error('AzureOpenAIService: chat request failed:', error);
      throw error;
    }
  }

  /**
   * Generate a playlist using separate system and user messages for better context separation
   */
  async generatePlaylist(systemMessage: string, userMessage: string, options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }): Promise<string> {

    const messages: AzureOpenAIMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user', 
        content: userMessage
      }
    ];

    return await this.chat(messages, {
      temperature: options?.temperature ?? 0.1, // Lower temperature for more factual responses
      maxTokens: options?.maxTokens ?? 3000,
      topP: options?.topP ?? 0.5, // More focused sampling
      frequencyPenalty: options?.frequencyPenalty ?? 0.0, // Allow repetition of known patterns
      presencePenalty: options?.presencePenalty ?? 0.0 // Don't penalize mentioning real artists/songs
    });
  }


  /**
   * Test the connection to Azure OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessage: AzureOpenAIMessage = {
        role: 'user',
        content: 'Hello, can you respond with just "OK"?'
      };

      const response = await this.chat([testMessage], {
        maxTokens: 10,
        temperature: 0
      });

      console.log('AzureOpenAIService: connection test successful');
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('AzureOpenAIService: connection test failed:', error);
      return false;
    }
  }

  /**
   * Get deployment information
   */
  async getDeploymentInfo(): Promise<{ deploymentName: string; endpoint: string }> {
    console.log('AzureOpenAIService: returning deployment information');
    return {
      deploymentName: this.deployment,
      endpoint: this.endpoint
    };
  }

  /**
   * Update the deployment name for this service instance
   */
  setDeployment(deploymentName: string): void {
    this.deployment = deploymentName;
    console.log(`AzureOpenAIService: switched to deployment ${deploymentName}`);
  }

  /**
   * Update the API version for this service instance
   */
  setApiVersion(apiVersion: string): void {
    this.apiVersion = apiVersion;
    console.log(`AzureOpenAIService: switched to API version ${apiVersion}`);
  }
}
