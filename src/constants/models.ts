export interface OpenRouterModel {
  id: string;
  displayName: string;
  description: string;
}

export const OPENROUTER_DEFAULT_MODELS: OpenRouterModel[] = [
  {
    id: 'google/gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    description: 'Google (Default)',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    displayName: 'DeepSeek V4 Flash',
    description: 'DeepSeek',
  },
  {
    id: 'anthropic/claude-sonnet-latest',
    displayName: 'Claude Sonnet Latest',
    description: 'Anthropic',
  },
];

export const CUSTOM_MODEL_VALUE = '__custom__';

/**
 * Default model used when the popup first sets up OpenRouter.
 * Matches the first entry of OPENROUTER_DEFAULT_MODELS.
 */
export const OPENROUTER_DEFAULT_MODEL_ID = OPENROUTER_DEFAULT_MODELS[0].id;
