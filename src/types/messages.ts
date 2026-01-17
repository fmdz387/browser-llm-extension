// Extension Message Protocol Types

import type { TransformPayload } from './transformations';

// ===== Request Types (content script/popup -> background) =====

export interface TranslatePayload {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface WritingPayload {
  text: string;
  action: 'improve' | 'simplify' | 'expand' | 'summarize' | 'rephrase';
  style?: 'formal' | 'casual' | 'professional' | 'academic' | 'creative';
}

export interface GrammarPayload {
  text: string;
  includeExplanations?: boolean;
}

export interface StreamPayload {
  prompt: string;
  requestId: string;
  model?: string;
  system?: string;
}

export type ExtensionRequest =
  | { type: 'TRANSLATE'; payload: TranslatePayload }
  | { type: 'WRITING_ASSIST'; payload: WritingPayload }
  | { type: 'GRAMMAR_CHECK'; payload: GrammarPayload }
  | { type: 'GENERATE_STREAM'; payload: StreamPayload }
  | { type: 'GET_CONFIG' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<ExtensionConfig> }
  | { type: 'LIST_MODELS' }
  | { type: 'TEST_CONNECTION' }
  | { type: 'CANCEL_REQUEST'; payload: { requestId: string } }
  | { type: 'TRANSFORM'; payload: TransformPayload }
  | { type: 'REFRESH_CONTEXT_MENUS' };

// ===== Response Types (background -> content script/popup) =====

export interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

export type ExtensionResponse<T> = SuccessResponse<T> | ErrorResponse;

// ===== Streaming Messages (background -> content script) =====

export interface StreamTokenMessage {
  type: 'STREAM_TOKEN';
  requestId: string;
  token: string;
}

export interface StreamCompleteMessage {
  type: 'STREAM_COMPLETE';
  requestId: string;
}

export interface StreamErrorMessage {
  type: 'STREAM_ERROR';
  requestId: string;
  error: string;
}

export interface StreamCancelledMessage {
  type: 'STREAM_CANCELLED';
  requestId: string;
}

export type StreamMessage =
  | StreamTokenMessage
  | StreamCompleteMessage
  | StreamErrorMessage
  | StreamCancelledMessage;

// ===== Context Menu Action (background -> content script) =====

export interface ContextMenuAction {
  type: 'CONTEXT_MENU_ACTION';
  action: 'translate' | 'improve' | 'grammar' | 'transform';
  transformationId?: string;  // For custom transformations
}

// ===== Configuration Types =====

export interface ExtensionConfig {
  provider: {
    type: 'ollama' | 'openai' | 'anthropic';
    host: string;
    port: number;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  translation: {
    defaultTargetLanguage: string;
    autoDetectSource: boolean;
  };
  writing: {
    defaultStyle: 'formal' | 'casual' | 'professional' | 'academic' | 'creative';
    defaultAction: 'improve' | 'simplify' | 'expand' | 'summarize' | 'rephrase';
  };
  ui: {
    theme: 'dark' | 'light' | 'system';
    showFloatingButton: boolean;
  };
}

// ===== Service Result Types =====

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

export interface WritingResult {
  improvedText: string;
}

export interface GrammarResult {
  correctedText: string;
  hasErrors: boolean;
  corrections?: Array<{
    original: string;
    corrected: string;
    explanation?: string;
  }>;
}

export interface AvailableModel {
  name: string;
  size: string;
  modifiedAt: string;
}
