import { create } from 'zustand';
import type { RequestState, RequestType, ActiveRequest } from '@/types/store';

export const useRequestStore = create<RequestState>((set, get) => ({
  current: null,
  abortController: null,

  startRequest: (type: RequestType, inputText: string): string => {
    const id = crypto.randomUUID();
    const request: ActiveRequest = {
      id,
      type,
      inputText,
      outputText: '',
      status: 'pending',
      startTime: Date.now(),
      endTime: null,
      tokensGenerated: 0,
      error: null,
    };

    const abortController = new AbortController();
    set({ current: request, abortController });
    return id;
  },

  appendToken: (token: string) => {
    set((state) => {
      if (!state.current) return state;
      return {
        current: {
          ...state.current,
          outputText: state.current.outputText + token,
          status: 'streaming',
          tokensGenerated: state.current.tokensGenerated + 1,
        },
      };
    });
  },

  completeRequest: () => {
    set((state) => {
      if (!state.current) return state;
      return {
        current: {
          ...state.current,
          status: 'completed',
          endTime: Date.now(),
        },
        abortController: null,
      };
    });
  },

  failRequest: (error: string) => {
    set((state) => {
      if (!state.current) return state;
      return {
        current: {
          ...state.current,
          status: 'error',
          endTime: Date.now(),
          error,
        },
        abortController: null,
      };
    });
  },

  cancelRequest: () => {
    const { abortController } = get();
    abortController?.abort();

    set((state) => {
      if (!state.current) return state;
      return {
        current: {
          ...state.current,
          status: 'cancelled',
          endTime: Date.now(),
        },
        abortController: null,
      };
    });
  },

  clearRequest: () => set({ current: null, abortController: null }),
}));
