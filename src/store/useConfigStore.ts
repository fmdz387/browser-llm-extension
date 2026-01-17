import {
  hasStoredApiKey,
  loadDecryptedApiKey,
  migrateFromPlaintextStorage,
  saveEncryptedApiKey,
  clearStoredApiKey,
} from '@/lib/secureKeyStorage';
import type { ProviderType } from '@/providers';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chromeStorageAdapter } from './middleware/chromeStorage';

export interface ProviderConfig {
  type: ProviderType;
  // Ollama settings
  host: string;
  port: number;
  // API-based provider settings (OpenRouter)
  apiKey: string;
  modelId: string;
  // Common settings
  model: string;
  temperature: number;
  maxTokens: number;
}

interface FeaturesConfig {
  translateEnabled: boolean;
  writingEnabled: boolean;
  grammarEnabled: boolean;
  defaultTargetLanguage: string;
}

interface ConfigStore {
  provider: ProviderConfig;
  features: FeaturesConfig;
  _hasHydrated: boolean;
  // Secure API key state - the actual key is stored encrypted separately
  hasApiKey: boolean;
  setProviderConfig: (config: Partial<ProviderConfig>) => void;
  setFeatureConfig: (config: Partial<FeaturesConfig>) => void;
  setHasHydrated: (state: boolean) => void;
  resetToDefaults: () => void;
  // Secure API key methods
  setHasApiKey: (hasKey: boolean) => void;
  saveApiKey: (apiKey: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  clearApiKey: () => Promise<void>;
  initializeSecureStorage: () => Promise<void>;
}

const DEFAULT_PROVIDER: ProviderConfig = {
  type: 'ollama',
  // Ollama settings
  host: 'localhost',
  port: 11434,
  // API-based provider settings
  apiKey: '',
  modelId: '',
  // Common settings
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
};

const DEFAULT_FEATURES: FeaturesConfig = {
  translateEnabled: true,
  writingEnabled: true,
  grammarEnabled: true,
  defaultTargetLanguage: 'English',
};

/** Get human-readable display name for a provider type */
export function getProviderDisplayName(type: ProviderType): string {
  const displayNames: Record<ProviderType, string> = {
    ollama: 'Ollama',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    openrouter: 'OpenRouter',
  };
  return displayNames[type] || type;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      provider: DEFAULT_PROVIDER,
      features: DEFAULT_FEATURES,
      _hasHydrated: false,
      hasApiKey: false,

      setProviderConfig: (config) =>
        set((state) => ({
          provider: { ...state.provider, ...config },
        })),

      setFeatureConfig: (config) =>
        set((state) => ({
          features: { ...state.features, ...config },
        })),

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      resetToDefaults: () =>
        set({
          provider: DEFAULT_PROVIDER,
          features: DEFAULT_FEATURES,
        }),

      setHasApiKey: (hasKey) => set({ hasApiKey: hasKey }),

      saveApiKey: async (apiKey: string) => {
        await saveEncryptedApiKey(apiKey);
        set({ hasApiKey: !!apiKey });
        // Also update the in-memory provider state for immediate use
        // (the actual key is stored encrypted, this is just for UI state)
        set((state) => ({
          provider: { ...state.provider, apiKey: apiKey ? '••••••••' : '' },
        }));
      },

      getApiKey: async () => {
        return loadDecryptedApiKey();
      },

      clearApiKey: async () => {
        await clearStoredApiKey();
        set({ hasApiKey: false });
        set((state) => ({
          provider: { ...state.provider, apiKey: '' },
        }));
      },

      initializeSecureStorage: async () => {
        // Run migration from plaintext storage
        const migrated = await migrateFromPlaintextStorage();
        if (migrated) {
          console.log('[ConfigStore] Migrated API key to encrypted storage');
        }

        // Check if we have an encrypted API key
        const hasKey = await hasStoredApiKey();
        set({ hasApiKey: hasKey });

        // Update UI state to show masked indicator if key exists
        if (hasKey) {
          set((state) => ({
            provider: { ...state.provider, apiKey: '••••••••' },
          }));
        }
      },
    }),
    {
      name: 'browser-llm-config',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({
        provider: state.provider,
        features: state.features,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Initialize secure storage after hydration
        state?.initializeSecureStorage();
      },
      // Handle migration from old 'ollama' key to 'provider'
      migrate: (persisted: unknown, _version: number) => {
        const state = persisted as Record<string, unknown>;
        // Migrate from old 'ollama' key to 'provider'
        if (state && 'ollama' in state && !('provider' in state)) {
          const oldConfig = state.ollama as Partial<ProviderConfig>;
          return {
            ...state,
            provider: {
              ...DEFAULT_PROVIDER,
              ...oldConfig,
              type: oldConfig.type || ('ollama' as ProviderType),
            },
            ollama: undefined, // Remove old key
          };
        }
        // Ensure type field exists
        if (state && 'provider' in state) {
          const provider = state.provider as Partial<ProviderConfig>;
          if (!provider.type) {
            return {
              ...state,
              provider: {
                ...DEFAULT_PROVIDER,
                ...provider,
                type: 'ollama' as ProviderType,
              },
            };
          }
        }
        return state;
      },
      version: 2,
    },
  ),
);
