// Provider Factory
import { OllamaAdapter } from './adapters/ollama';
import type { LLMProvider, ProviderConfig, ProviderType } from './types';

/**
 * Singleton provider instance
 */
let currentProvider: LLMProvider | null = null;
let currentConfig: ProviderConfig | null = null;

/**
 * Create a provider instance from config
 */
export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'ollama':
      return new OllamaAdapter({
        host: config.host,
        port: config.port,
      });

    case 'openai':
      throw new Error('OpenAI provider not yet implemented');

    case 'anthropic':
      throw new Error('Anthropic provider not yet implemented');

    default:
      throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
  }
}

/**
 * Get the current provider singleton
 * If no provider exists, creates one with default Ollama config
 */
export function getProvider(config?: ProviderConfig): LLMProvider {
  // If config is provided and different from current, create new provider
  if (config) {
    const configChanged =
      !currentConfig ||
      currentConfig.provider !== config.provider ||
      !isSameConfig(currentConfig, config);

    if (configChanged) {
      currentProvider = createProvider(config);
      currentConfig = config;
    } else if (
      currentProvider &&
      currentConfig &&
      currentConfig.provider === 'ollama' &&
      config.provider === 'ollama'
    ) {
      // Update existing Ollama adapter config
      (currentProvider as OllamaAdapter).updateConfig({
        host: config.host,
        port: config.port,
      });
      currentConfig = config;
    }
  }

  // Create default provider if none exists
  if (!currentProvider) {
    currentConfig = { provider: 'ollama', host: 'localhost', port: 11434 };
    currentProvider = createProvider(currentConfig);
  }

  return currentProvider;
}

/**
 * Update provider configuration
 * If provider type changes, creates a new provider
 */
export function updateProviderConfig(config: ProviderConfig): LLMProvider {
  return getProvider(config);
}

/**
 * Get the current provider type
 */
export function getCurrentProviderType(): ProviderType | null {
  return currentConfig?.provider ?? null;
}

/**
 * Check if two configs are the same (deep comparison)
 */
function isSameConfig(a: ProviderConfig, b: ProviderConfig): boolean {
  if (a.provider !== b.provider) return false;

  switch (a.provider) {
    case 'ollama':
      return b.provider === 'ollama' && a.host === b.host && a.port === b.port;

    case 'openai':
      return b.provider === 'openai' && a.apiKey === b.apiKey && a.baseUrl === b.baseUrl;

    case 'anthropic':
      return b.provider === 'anthropic' && a.apiKey === b.apiKey;

    default:
      return false;
  }
}

/**
 * Reset the provider (useful for testing)
 */
export function resetProvider(): void {
  currentProvider = null;
  currentConfig = null;
}
