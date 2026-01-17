// Ollama Provider Adapter
import { Ollama } from 'ollama/browser';

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

interface OllamaConfig {
  host: string;
  port: number;
}

/**
 * Ollama provider adapter using official ollama npm package
 */
export class OllamaAdapter implements LLMProvider {
  readonly name = 'ollama' as const;
  private client: Ollama;
  private abortController: AbortController | null = null;

  constructor(config: OllamaConfig) {
    this.client = new Ollama({
      host: `http://${config.host}:${config.port}`,
    });
  }

  /**
   * Update configuration (creates new client)
   */
  updateConfig(config: OllamaConfig): void {
    this.client = new Ollama({
      host: `http://${config.host}:${config.port}`,
    });
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<LLMResult<boolean>> {
    try {
      // Use list() to verify connection - it's lightweight
      await this.client.list();
      return createSuccess(true);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<LLMResult<ModelInfo[]>> {
    try {
      const response = await this.client.list();
      const models: ModelInfo[] = response.models.map((m) => ({
        name: m.name,
        size: formatBytes(m.size),
        modifiedAt: m.modified_at instanceof Date
          ? m.modified_at.toISOString()
          : String(m.modified_at ?? ''),
      }));
      return createSuccess(models);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  /**
   * Complete a chat request (non-streaming)
   */
  async complete(request: CompletionRequest): Promise<LLMResult<CompletionResponse>> {
    this.abortController = new AbortController();

    if (!request.model) {
      return createError(LLMErrorCode.MODEL_NOT_FOUND, 'No model specified');
    }

    try {
      const response = await this.client.chat({
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: request.options?.temperature,
          num_predict: request.options?.maxTokens,
          top_p: request.options?.topP,
          stop: request.options?.stop,
        },
      });

      return createSuccess({
        content: response.message.content,
        model: response.model,
        usage:
          response.prompt_eval_count !== undefined && response.eval_count !== undefined
            ? {
                promptTokens: response.prompt_eval_count,
                completionTokens: response.eval_count,
                totalTokens: response.prompt_eval_count + response.eval_count,
              }
            : undefined,
        finishReason: 'stop',
      });
    } catch (error) {
      // Check for model not found error
      if (error instanceof Error && error.message.includes('not found')) {
        return createError(LLMErrorCode.MODEL_NOT_FOUND, `Model '${request.model}' not found`);
      }
      return handleFetchError(error);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stream a chat completion
   */
  async *stream(request: CompletionRequest): AsyncIterable<StreamToken> {
    this.abortController = new AbortController();

    if (!request.model) {
      throw new Error('No model specified');
    }

    try {
      const stream = await this.client.chat({
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: request.options?.temperature,
          num_predict: request.options?.maxTokens,
          top_p: request.options?.topP,
          stop: request.options?.stop,
        },
      });

      for await (const chunk of stream) {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          return;
        }
        yield {
          content: chunk.message.content,
          done: chunk.done,
        };
      }
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
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
