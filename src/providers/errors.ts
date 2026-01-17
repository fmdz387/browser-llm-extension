// Provider Error Handling
import { type LLMError, LLMErrorCode, type LLMResult } from './types';

/**
 * Create an error result
 */
export function createError(
  code: LLMErrorCode,
  message: string,
  details?: unknown,
): LLMResult<never> {
  return {
    success: false,
    error: { code, message, details },
  };
}

/**
 * Create a success result
 */
export function createSuccess<T>(data: T): LLMResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Normalize unknown errors to LLMError
 */
export function normalizeError(error: unknown): LLMError {
  if (error instanceof Error) {
    // Network/fetch errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    ) {
      return {
        code: LLMErrorCode.CONNECTION_FAILED,
        message: 'Network error. Check your connection and ensure the provider is running.',
        details: error,
      };
    }

    // Abort errors
    if (error.name === 'AbortError') {
      return {
        code: LLMErrorCode.CANCELLED,
        message: 'Request was cancelled',
        details: error,
      };
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        code: LLMErrorCode.TIMEOUT,
        message: 'Request timed out',
        details: error,
      };
    }

    // Generic error
    return {
      code: LLMErrorCode.UNKNOWN,
      message: error.message,
      details: error,
    };
  }

  // Unknown error type
  return {
    code: LLMErrorCode.UNKNOWN,
    message: 'An unknown error occurred',
    details: error,
  };
}

/**
 * Handle fetch errors and convert to LLMResult
 */
export function handleFetchError(error: unknown): LLMResult<never> {
  const llmError = normalizeError(error);
  return {
    success: false,
    error: llmError,
  };
}
