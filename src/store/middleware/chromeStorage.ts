import type { StateStorage } from 'zustand/middleware';

/**
 * Sanitize state before storing to remove sensitive data
 * API keys are stored separately using secureKeyStorage
 */
function sanitizeStateForStorage(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (parsed.state?.provider?.apiKey) {
      // Remove API key from sync storage - it's stored encrypted separately
      parsed.state.provider.apiKey = '';
    }
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

/**
 * Chrome Storage adapter for Zustand persist middleware.
 * Uses chrome.storage.sync for cross-device persistence.
 * Falls back to localStorage for development/non-extension contexts.
 *
 * Note: API keys are NOT stored here - they are stored encrypted in
 * chrome.storage.local via secureKeyStorage.ts
 */
export const chromeStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(name);
        return result[name] ?? null;
      }
    } catch {
      // Fall through to localStorage
    }
    // Fallback for dev mode or non-extension context
    return localStorage.getItem(name);
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Sanitize state to remove sensitive data before storing
    const sanitizedValue = sanitizeStateForStorage(value);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ [name]: sanitizedValue });
        return;
      }
    } catch {
      // Fall through to localStorage
    }
    localStorage.setItem(name, sanitizedValue);
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.remove(name);
        return;
      }
    } catch {
      // Fall through to localStorage
    }
    localStorage.removeItem(name);
  },
};

/**
 * Sets up a listener for chrome.storage changes to sync state across contexts.
 * Call this in each context (popup, content script) that uses the store.
 */
export function setupStorageListener<T>(
  storeName: string,
  onStateChange: (state: Partial<T>) => void,
) {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => {}; // No-op cleanup for non-extension context
  }

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'sync' && changes[storeName]) {
      const newValue = changes[storeName].newValue;
      if (newValue) {
        try {
          const parsed = JSON.parse(newValue);
          if (parsed.state) {
            onStateChange(parsed.state);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
