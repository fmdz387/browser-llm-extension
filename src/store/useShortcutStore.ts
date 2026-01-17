import { DEFAULT_SHORTCUTS } from '@/constants/shortcuts';
import { validateShortcut, normalizeShortcutString } from '@/services/ShortcutService';
import type { KeyboardShortcut, ShortcutValidationResult } from '@/types/shortcuts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chromeStorageAdapter } from './middleware/chromeStorage';

interface ShortcutStore {
  shortcuts: KeyboardShortcut[];
  globalEnabled: boolean;
  requireTextSelection: boolean;
  disableInEditableFields: boolean;
  _hasHydrated: boolean;

  setShortcut: (id: string, keys: string) => ShortcutValidationResult;
  addCustomShortcut: (transformationId: string, keys: string, label?: string) => ShortcutValidationResult & { shortcut?: KeyboardShortcut };
  removeShortcut: (id: string) => void;
  toggleShortcut: (id: string) => void;
  resetToDefaults: () => void;
  setGlobalEnabled: (enabled: boolean) => void;
  setRequireTextSelection: (required: boolean) => void;
  setDisableInEditableFields: (disabled: boolean) => void;
  getShortcutByKeys: (keys: string) => KeyboardShortcut | undefined;
  getEnabledShortcuts: () => KeyboardShortcut[];
  setHasHydrated: (state: boolean) => void;
}

function createDefaultShortcuts(): KeyboardShortcut[] {
  return DEFAULT_SHORTCUTS.map((s) => ({ ...s, id: crypto.randomUUID() }));
}

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set, get) => ({
      shortcuts: [],
      globalEnabled: true,
      requireTextSelection: true,
      disableInEditableFields: true,
      _hasHydrated: false,

      setShortcut: (id, keys) => {
        const validation = validateShortcut(keys, get().shortcuts, id);
        if (!validation.valid && validation.error?.type !== 'system_conflict') return validation;

        set((s) => ({
          shortcuts: s.shortcuts.map((sc) => (sc.id === id ? { ...sc, keys: normalizeShortcutString(keys) } : sc)),
        }));
        return validation;
      },

      addCustomShortcut: (transformationId, keys, label) => {
        const validation = validateShortcut(keys, get().shortcuts);
        if (!validation.valid && validation.error?.type !== 'system_conflict') return validation;

        const newShortcut: KeyboardShortcut = {
          id: crypto.randomUUID(),
          keys: normalizeShortcutString(keys),
          actionId: transformationId,
          actionType: 'transformation',
          enabled: true,
          label,
        };

        set((s) => ({ shortcuts: [...s.shortcuts, newShortcut] }));
        return { ...validation, shortcut: newShortcut };
      },

      removeShortcut: (id) => set((s) => ({ shortcuts: s.shortcuts.filter((sc) => sc.id !== id) })),
      toggleShortcut: (id) => set((s) => ({ shortcuts: s.shortcuts.map((sc) => (sc.id === id ? { ...sc, enabled: !sc.enabled } : sc)) })),
      resetToDefaults: () => set({ shortcuts: createDefaultShortcuts() }),
      setGlobalEnabled: (enabled) => set({ globalEnabled: enabled }),
      setRequireTextSelection: (required) => set({ requireTextSelection: required }),
      setDisableInEditableFields: (disabled) => set({ disableInEditableFields: disabled }),

      getShortcutByKeys: (keys) => {
        const normalized = normalizeShortcutString(keys);
        return get().shortcuts.find((s) => normalizeShortcutString(s.keys) === normalized);
      },

      getEnabledShortcuts: () => get().shortcuts.filter((s) => s.enabled),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'browser-llm-shortcuts',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({
        shortcuts: state.shortcuts,
        globalEnabled: state.globalEnabled,
        requireTextSelection: state.requireTextSelection,
        disableInEditableFields: state.disableInEditableFields,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.shortcuts.length === 0) state.shortcuts = createDefaultShortcuts();
          state.setHasHydrated(true);
        }
      },
      version: 3,
      migrate: () => ({
        shortcuts: createDefaultShortcuts(),
        globalEnabled: true,
        requireTextSelection: true,
        disableInEditableFields: true,
      }),
    }
  )
);
