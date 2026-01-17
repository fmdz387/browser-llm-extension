import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { chromeStorageAdapter } from './middleware/chromeStorage';
import type { ProviderType } from '@/providers';

export interface ProviderConfig {
  type: ProviderType;
  host: string;
  port: number;
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
  setProviderConfig: (config: Partial<ProviderConfig>) => void;
  setFeatureConfig: (config: Partial<FeaturesConfig>) => void;
  setHasHydrated: (state: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_PROVIDER: ProviderConfig = {
  type: 'ollama',
  host: 'localhost',
  port: 11434,
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
  };
  return displayNames[type] || type;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      provider: DEFAULT_PROVIDER,
      features: DEFAULT_FEATURES,
      _hasHydrated: false,

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
    }
  )
);
