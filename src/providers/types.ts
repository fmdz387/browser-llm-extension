// Provider Abstraction Types

/**
 * Unified message format for all LLM providers
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Unified completion request
 */
export interface CompletionRequest {
  messages: LLMMessage[];
  model: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stop?: string[];
  };
}

/**
 * Unified completion response
 */
export interface CompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'cancelled';
}

/**
 * Stream token for streaming responses
 */
export interface StreamToken {
  content: string;
  done: boolean;
}

/**
 * Model information from provider
 */
export interface ModelInfo {
  name: string;
  size?: string;
  modifiedAt?: string;
}

/**
 * Error codes for LLM operations
 */
export enum LLMErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * LLM error structure
 */
export interface LLMError {
  code: LLMErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Result type for LLM operations
 */
export type LLMResult<T> = { success: true; data: T } | { success: false; error: LLMError };

/**
 * Provider configuration (discriminated union)
 */
export type ProviderConfig =
  | { provider: 'ollama'; host: string; port: number }
  | { provider: 'openai'; apiKey: string; baseUrl?: string }
  | { provider: 'anthropic'; apiKey: string }
  | { provider: 'openrouter'; apiKey: string; modelId: string };

/**
 * Provider type identifier
 */
export type ProviderType = ProviderConfig['provider'];

/**
 * LLM Provider interface (Strategy pattern)
 */
export interface LLMProvider {
  /** Provider name identifier */
  readonly name: ProviderType;

  /** Test connection to the provider */
  testConnection(): Promise<LLMResult<boolean>>;

  /** List available models */
  listModels(): Promise<LLMResult<ModelInfo[]>>;

  /** Complete a chat request (non-streaming) */
  complete(request: CompletionRequest): Promise<LLMResult<CompletionResponse>>;

  /** Stream a chat completion */
  stream(request: CompletionRequest): AsyncIterable<StreamToken>;

  /** Abort any ongoing request */
  abort(): void;
}
