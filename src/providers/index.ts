// Provider Abstraction Layer - Public Exports

// Types
export type {
  CompletionRequest,
  CompletionResponse,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResult,
  ModelInfo,
  ProviderConfig,
  ProviderType,
  StreamToken,
} from './types';

export { LLMErrorCode } from './types';

// Factory
export {
  createProvider,
  getCurrentProviderType,
  getProvider,
  resetProvider,
  updateProviderConfig,
} from './factory';

// Errors
export { createError, createSuccess, handleFetchError, normalizeError } from './errors';

// Adapters
export { OllamaAdapter } from './adapters/ollama';
export { OpenRouterAdapter } from './adapters/openrouter';
