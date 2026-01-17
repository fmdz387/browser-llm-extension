// Provider Factory
import { loadDecryptedApiKey } from '@/lib/secureKeyStorage';

import { OllamaAdapter } from './adapters/ollama';
import { OpenRouterAdapter } from './adapters/openrouter';
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

    case 'openrouter':
      return new OpenRouterAdapter({
        apiKey: config.apiKey,
        modelId: config.modelId,
      });

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
    } else if (
      currentProvider &&
      currentConfig &&
      currentConfig.provider === 'openrouter' &&
      config.provider === 'openrouter'
    ) {
      // Update existing OpenRouter adapter config
      (currentProvider as OpenRouterAdapter).updateConfig({
        apiKey: config.apiKey,
        modelId: config.modelId,
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

    case 'openrouter':
      return b.provider === 'openrouter' && a.apiKey === b.apiKey && a.modelId === b.modelId;

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

/**
 * Config types for getProviderWithSecureKey (API key retrieved from secure storage)
 */
type SecureProviderConfig =
  | { provider: 'ollama'; host: string; port: number }
  | { provider: 'openai'; baseUrl?: string }
  | { provider: 'anthropic' }
  | { provider: 'openrouter'; modelId: string };

/**
 * Get provider with secure API key retrieval
 * For providers that require API keys, retrieves the decrypted key from secure storage
 */
export async function getProviderWithSecureKey(
  baseConfig: SecureProviderConfig
): Promise<LLMProvider> {
  if (baseConfig.provider === 'openrouter') {
    // Retrieve decrypted API key from secure storage
    const apiKey = await loadDecryptedApiKey();

    if (!apiKey) {
      throw new Error('No API key configured for OpenRouter');
    }

    return getProvider({
      provider: 'openrouter',
      apiKey,
      modelId: baseConfig.modelId,
    });
  }

  if (baseConfig.provider === 'openai') {
    const apiKey = await loadDecryptedApiKey();

    if (!apiKey) {
      throw new Error('No API key configured for OpenAI');
    }

    return getProvider({
      provider: 'openai',
      apiKey,
      baseUrl: baseConfig.baseUrl,
    });
  }

  if (baseConfig.provider === 'anthropic') {
    const apiKey = await loadDecryptedApiKey();

    if (!apiKey) {
      throw new Error('No API key configured for Anthropic');
    }

    return getProvider({
      provider: 'anthropic',
      apiKey,
    });
  }

  // For providers that don't need API keys (like Ollama)
  return getProvider(baseConfig);
}
