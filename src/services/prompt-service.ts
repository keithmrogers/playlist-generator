export interface PromptTemplate {
  id: string;
  description: string;
  template: string;
}

export interface CampaignConfig {
  campaignName: string;
  setting: string;
  timePeriod: string;
  styles: string;
  influences: string;
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

    // simple variable interpolation
    let text = tpl.template;
    for (const [key, value] of Object.entries(mergedVars)) {
      const pattern = new RegExp(`{${key}}`, 'g');
      text = text.replace(pattern, String(value));
    }
    return text;
  }
}
