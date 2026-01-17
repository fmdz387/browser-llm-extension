import type { StateStorage } from 'zustand/middleware';

/**
 * Chrome Storage adapter for Zustand persist middleware.
 * Uses chrome.storage.sync for cross-device persistence.
 * Falls back to localStorage for development/non-extension contexts.
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
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ [name]: value });
        return;
      }
    } catch {
      // Fall through to localStorage
    }
    localStorage.setItem(name, value);
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
