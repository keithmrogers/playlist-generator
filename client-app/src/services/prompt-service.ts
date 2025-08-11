export interface PromptTemplate {
  id: string;
  description: string;
  systemTemplate: string;
  userTemplate: string;
}

export interface CampaignConfig {
  campaignName: string;
  setting: string;
  timePeriod: string;
  styles: string;
  influences: string;
}

export interface PromptMessages {
  systemMessage: string;
  userMessage: string;
}

export class PromptService {
  constructor(
    private templates: PromptTemplate[],
    private campaignConfig: CampaignConfig
  ) {}

  async getPrompt(id: string, vars: Record<string, string | number>): Promise<string> {
    // merge campaign defaults with runtime vars
    const mergedVars = { ...this.campaignConfig, ...vars };
    const tpl = this.templates.find(t => t.id === id);
    if (!tpl) {
      throw new Error(`Prompt template with id '${id}' not found`);
    }

    // simple variable interpolation for user template only (for backward compatibility)
    let text = tpl.userTemplate;
    for (const [key, value] of Object.entries(mergedVars)) {
      const pattern = new RegExp(`{${key}}`, 'g');
      text = text.replace(pattern, String(value));
    }
    return text;
  }

  async getPromptMessages(id: string, vars: Record<string, string | number>): Promise<PromptMessages> {
    // merge campaign defaults with runtime vars
    const mergedVars = { ...this.campaignConfig, ...vars };
    const tpl = this.templates.find(t => t.id === id);
    if (!tpl) {
      throw new Error(`Prompt template with id '${id}' not found`);
    }

    // simple variable interpolation for both templates
    let systemMessage = tpl.systemTemplate;
    let userMessage = tpl.userTemplate;
    
    for (const [key, value] of Object.entries(mergedVars)) {
      const pattern = new RegExp(`{${key}}`, 'g');
      systemMessage = systemMessage.replace(pattern, String(value));
      userMessage = userMessage.replace(pattern, String(value));
    }
    
    return {
      systemMessage,
      userMessage
    };
  }
}
