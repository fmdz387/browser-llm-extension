// Zustand Store Types

import type { ExtensionConfig, AvailableModel } from './messages';

// ===== Connection State =====

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  lastChecked: number | null;
  error: string | null;
  availableModels: AvailableModel[];

  // Actions
  checkConnection: () => Promise<void>;
  setStatus: (status: ConnectionStatus, error?: string) => void;
  setModels: (models: AvailableModel[]) => void;
}

// ===== Active Request State =====

export type RequestStatus = 'idle' | 'pending' | 'streaming' | 'completed' | 'error' | 'cancelled';
export type RequestType = 'translate' | 'improve' | 'simplify' | 'expand' | 'summarize' | 'rephrase' | 'grammar';

export interface ActiveRequest {
  id: string;
  type: RequestType;
  inputText: string;
  outputText: string;
  status: RequestStatus;
  startTime: number;
  endTime: number | null;
  tokensGenerated: number;
  error: string | null;
}

export interface RequestState {
  current: ActiveRequest | null;
  abortController: AbortController | null;

  // Actions
  startRequest: (type: RequestType, inputText: string) => string;
  appendToken: (token: string) => void;
  completeRequest: () => void;
  failRequest: (error: string) => void;
  cancelRequest: () => void;
  clearRequest: () => void;
}

// ===== Config State =====

export interface ConfigState extends ExtensionConfig {
  // Actions
  updateProvider: (config: Partial<ExtensionConfig['provider']>) => void;
  updateTranslation: (config: Partial<ExtensionConfig['translation']>) => void;
  updateWriting: (config: Partial<ExtensionConfig['writing']>) => void;
  updateUI: (config: Partial<ExtensionConfig['ui']>) => void;
  resetToDefaults: () => void;
}

// ===== History State =====

export interface HistoryEntry {
  id: string;
  type: RequestType;
  inputText: string;
  outputText: string;
  timestamp: number;
  model: string;
  duration: number;
  tokensGenerated: number;
}

export interface HistoryState {
  entries: HistoryEntry[];
  maxEntries: number;

  // Actions
  addEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
}
