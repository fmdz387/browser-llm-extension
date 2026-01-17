import type { AvailableModel } from '@/types/messages';
import type { ConnectionState, ConnectionStatus } from '@/types/store';
import { sendToBackground } from '@/utils/messaging';
import { create } from 'zustand';

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastChecked: null,
  error: null,
  availableModels: [],

  checkConnection: async () => {
    set({ status: 'connecting', error: null });

    try {
      const response = await sendToBackground<boolean>({ type: 'TEST_CONNECTION' });

      if (response.success) {
        // Connection successful, now get models
        const modelsResponse = await sendToBackground<{ models: AvailableModel[] }>({
          type: 'LIST_MODELS',
        });

        set({
          status: 'connected',
          lastChecked: Date.now(),
          error: null,
          availableModels: modelsResponse.success ? modelsResponse.data.models : [],
        });
      } else {
        set({
          status: 'error',
          lastChecked: Date.now(),
          error: response.error.message,
        });
      }
    } catch (error) {
      set({
        status: 'error',
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  },

  setStatus: (status: ConnectionStatus, error?: string) =>
    set({ status, error: error ?? null, lastChecked: Date.now() }),

  setModels: (models: AvailableModel[]) => set({ availableModels: models }),
}));
