import { LLMErrorCode } from '@/providers';

/**
 * Base extension error class
 */
export class ExtensionError extends Error {
  constructor(
    public code: string,
    message: string,
    public recoverable: boolean = true,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

/**
 * Connection error - Provider not reachable
 */
export class ConnectionError extends ExtensionError {
  constructor(message: string = 'Cannot connect to LLM provider') {
    super(LLMErrorCode.CONNECTION_FAILED, message, true);
    this.name = 'ConnectionError';
  }
}

/**
 * Model error - requested model not found
 */
export class ModelError extends ExtensionError {
  constructor(model: string) {
    super(LLMErrorCode.MODEL_NOT_FOUND, `Model '${model}' not found`, true, {
      model,
    });
    this.name = 'ModelError';
  }
}

/**
 * Timeout error - operation took too long
 */
export class TimeoutError extends ExtensionError {
  constructor(operation: string) {
    super(LLMErrorCode.TIMEOUT, `Operation '${operation}' timed out`, true, {
      operation,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Convert unknown error to a structured error response
 */
export function handleError(error: unknown): { code: string; message: string } {
  if (error instanceof ExtensionError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    // Parse common network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: LLMErrorCode.CONNECTION_FAILED,
        message: 'Network error. Check your connection and ensure the provider is running.',
      };
    }

    if (error.name === 'AbortError') {
      return {
        code: LLMErrorCode.CANCELLED,
        message: 'Request was cancelled',
      };
    }

    return { code: LLMErrorCode.UNKNOWN, message: error.message };
  }

  return {
    code: LLMErrorCode.UNKNOWN,
    message: 'An unknown error occurred',
  };
}

/**
 * Retry utility for transient failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error instanceof ModelError) {
        throw error;
      }

      // Wait before retrying (with exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
