// Provider Abstraction Layer - Public Exports

// Types
export type {
  CompletionRequest,
  CompletionResponse,
  ImageContentPart,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResult,
  MessageContentPart,
  ModelInfo,
  ProviderConfig,
  ProviderType,
  StreamToken,
  TextContentPart,
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
