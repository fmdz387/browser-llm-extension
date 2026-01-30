import { OpenRouter } from '@openrouter/sdk';

import { createError, createSuccess, handleFetchError } from '../errors';
import type {
  CompletionRequest,
  CompletionResponse,
  LLMProvider,
  LLMResult,
  ModelInfo,
  StreamToken,
} from '../types';
import { LLMErrorCode } from '../types';

interface OpenRouterConfig {
  apiKey: string;
  modelId: string;
}

/**
 * OpenRouter provider adapter using official @openrouter/sdk
 */
export class OpenRouterAdapter implements LLMProvider {
  readonly name = 'openrouter' as const;
  private client: OpenRouter;
  private modelId: string;
  private abortController: AbortController | null = null;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenRouter({ apiKey: config.apiKey });
    this.modelId = config.modelId;
  }

  /**
   * Update configuration (creates new client)
   */
  updateConfig(config: OpenRouterConfig): void {
    this.client = new OpenRouter({ apiKey: config.apiKey });
    this.modelId = config.modelId;
  }

  /**
   * Test connection to OpenRouter by making a minimal request
   */
  async testConnection(): Promise<LLMResult<boolean>> {
    try {
      // Make a minimal completion request to verify API key
      await this.client.chat.send({
        model: this.modelId,
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      });

      return createSuccess(true);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List available models - returns empty array (user specifies model ID manually)
   */
  async listModels(): Promise<LLMResult<ModelInfo[]>> {
    // OpenRouter has too many models to list; user specifies model ID directly
    return createSuccess([]);
  }

  /**
   * Format message content for OpenRouter SDK
   * Handles both string content and multimodal content arrays
   * Note: OpenRouter SDK expects camelCase (imageUrl), not snake_case (image_url)
   */
  private formatMessageContent(
    content: string | Array<{ type: string; text?: string; imageUrl?: { url: string } }>,
  ): string | Array<{ type: string; text?: string; imageUrl?: { url: string } }> {
    // If it's a string, return as-is
    if (typeof content === 'string') {
      return content;
    }
    // If it's an array (multimodal), return as-is for OpenRouter SDK
    return content;
  }

  /**
   * Complete a chat request (non-streaming)
   */
  async complete(request: CompletionRequest): Promise<LLMResult<CompletionResponse>> {
    this.abortController = new AbortController();

    // Use the adapter's modelId if request doesn't specify one
    const model = request.model || this.modelId;
    if (!model) {
      return createError(LLMErrorCode.MODEL_NOT_FOUND, 'No model specified');
    }

    try {
      // Format messages for OpenRouter SDK
      // SDK accepts both string content and multimodal content arrays
      const formattedMessages = request.messages.map((m) => ({
        role: m.role,
        content: this.formatMessageContent(m.content),
      }));

      const response = await this.client.chat.send({
        model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: formattedMessages as any,
        stream: false,
        temperature: request.options?.temperature ?? undefined,
        maxTokens: request.options?.maxTokens ?? undefined,
        topP: request.options?.topP ?? undefined,
        stop: request.options?.stop ?? undefined,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        return createError(LLMErrorCode.INVALID_RESPONSE, 'No content in response');
      }

      return createSuccess({
        content,
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
            }
          : undefined,
        finishReason: response.choices[0]?.finishReason === 'length' ? 'length' : 'stop',
      });
    } catch (error) {
      return this.handleError(error);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stream a chat completion using SDK's EventStream
   */
  async *stream(request: CompletionRequest): AsyncIterable<StreamToken> {
    this.abortController = new AbortController();

    // Use the adapter's modelId if request doesn't specify one
    const model = request.model || this.modelId;
    if (!model) {
      throw new Error('No model specified');
    }

    try {
      // Format messages for OpenRouter SDK
      const formattedMessages = request.messages.map((m) => ({
        role: m.role,
        content: this.formatMessageContent(m.content),
      }));

      const stream = await this.client.chat.send({
        model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: formattedMessages as any,
        stream: true,
        temperature: request.options?.temperature ?? undefined,
        maxTokens: request.options?.maxTokens ?? undefined,
        topP: request.options?.topP ?? undefined,
        stop: request.options?.stop ?? undefined,
      });

      for await (const chunk of stream) {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          return;
        }

        const content = chunk.choices?.[0]?.delta?.content ?? '';
        const finishReason = chunk.choices?.[0]?.finishReason;

        if (content) {
          yield { content, done: false };
        }

        if (finishReason) {
          yield { content: '', done: true };
          return;
        }
      }

      // Stream completed
      yield { content: '', done: true };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Abort any ongoing request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Handle errors and convert to LLMResult
   */
  private handleError(error: unknown): LLMResult<never> {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('invalid api key')
      ) {
        return createError(LLMErrorCode.AUTHENTICATION_FAILED, 'Invalid API key');
      }

      if (message.includes('404') || message.includes('not found')) {
        return createError(LLMErrorCode.MODEL_NOT_FOUND, `Model '${this.modelId}' not found`);
      }

      if (message.includes('429') || message.includes('rate limit')) {
        return createError(LLMErrorCode.RATE_LIMITED, 'Rate limited. Please try again later.');
      }

      if (error.name === 'AbortError') {
        return createError(LLMErrorCode.CANCELLED, 'Request was cancelled');
      }
    }

    return handleFetchError(error);
  }
}
