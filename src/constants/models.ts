export interface OpenRouterModel {
  id: string;
  displayName: string;
  description: string;
}

export const OPENROUTER_DEFAULT_MODELS: OpenRouterModel[] = [
  {
    id: 'anthropic/claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    description: 'Anthropic (Default)',
  },
  {
    id: 'xiaomi/mimo-v2-flash:free',
    displayName: 'MiMo-V2-Flash',
    description: 'Xiaomi (Free)',
  },
  {
    id: 'x-ai/grok-code-fast-1',
    displayName: 'Grok Code Fast 1',
    description: 'xAI',
  },
  {
    id: 'google/gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    description: 'Google',
  },
];

export const CUSTOM_MODEL_VALUE = '__custom__';
