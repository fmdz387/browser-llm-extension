import type { ExtensionRequest, ExtensionResponse } from '@/types/messages';

/**
 * Send a message to the background service worker with type safety.
 * Returns a promise that resolves with the response.
 */
export function sendToBackground<T>(message: ExtensionRequest): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({
        success: false,
        error: {
          code: 'NO_RUNTIME',
          message: 'Chrome runtime not available',
        },
      });
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: {
            code: 'MESSAGING_ERROR',
            message: chrome.runtime.lastError.message || 'Unknown messaging error',
          },
        });
      } else {
        resolve(
          response ?? {
            success: false,
            error: { code: 'NO_RESPONSE', message: 'No response received' },
          },
        );
      }
    });
  });
}

/**
 * Send a message to a specific tab's content script.
 */
export function sendToTab<T>(tabId: number, message: unknown): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      resolve(undefined);
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Generate a unique request ID for tracking streaming responses.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

// Alias for convenience
export const sendMessage = sendToBackground;
