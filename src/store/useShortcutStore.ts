import { DEFAULT_SHORTCUTS } from '@/constants/shortcuts';
import {
  validateShortcut,
  normalizeShortcutString,
  migrateLegacyShortcutString,
} from '@/services/ShortcutService';
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

/** Pre-v4 stock keys ("alt+t/c/g") were the original defaults. */
const V3_STOCK_KEYS = new Set(['alt+t', 'alt+c', 'alt+g']);

/** v4 stock keys (cross-platform cmdorctrl+shift+t/c/g). */
const V4_STOCK_KEYS = new Set([
  'cmdorctrl+shift+t',
  'cmdorctrl+shift+c',
  'cmdorctrl+shift+g',
]);

function isV3Stock(s: KeyboardShortcut): boolean {
  return s.actionType === 'transformation' && V3_STOCK_KEYS.has(s.keys);
}

function isV4Stock(s: KeyboardShortcut): boolean {
  return s.actionType === 'transformation' && V4_STOCK_KEYS.has(s.keys);
}

/**
 * Migrate the shortcut array across schema versions.
 *
 * v3 → v5:
 *   - "alt+t/c/g" stock entries → new platform-aware stock set.
 *   - Custom "ctrl+X" entries → "cmdorctrl+X" (preserve cross-platform intent).
 *
 * v4 → v5:
 *   - "cmdorctrl+shift+t/c/g" stock entries → new stock set
 *     (drops Make Concise, adds Translate to Urban English).
 *   - Customised entries untouched.
 */
function migrateShortcutsArray(existing: KeyboardShortcut[], fromVersion: number): KeyboardShortcut[] {
  if (existing.length === 0) return createDefaultShortcuts();

  // If the user is still on the original stock set, just swap to the new stock set.
  if (fromVersion < 4 && existing.every(isV3Stock)) return createDefaultShortcuts();
  if (fromVersion < 5 && existing.every(isV4Stock)) return createDefaultShortcuts();

  return existing.map((s) => {
    if (fromVersion < 4 && isV3Stock(s)) {
      const next = DEFAULT_SHORTCUTS.find((d) => d.actionId === s.actionId);
      return next ? { ...s, keys: next.keys } : s;
    }
    if (fromVersion < 5 && isV4Stock(s)) {
      const next = DEFAULT_SHORTCUTS.find((d) => d.actionId === s.actionId);
      return next ? { ...s, keys: next.keys } : s;
    }
    if (fromVersion < 4) {
      return { ...s, keys: migrateLegacyShortcutString(s.keys) };
    }
    return s;
  });
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
      version: 5,
      migrate: (persisted: unknown, version: number) => {
        const fallback = {
          shortcuts: createDefaultShortcuts(),
          globalEnabled: true,
          requireTextSelection: true,
          disableInEditableFields: true,
        };

        if (!persisted || typeof persisted !== 'object') return fallback;
        const state: Partial<ShortcutStore> = { ...persisted };

        if (version < 5) {
          const next = Array.isArray(state.shortcuts) ? state.shortcuts : [];
          return {
            ...fallback,
            ...state,
            shortcuts: migrateShortcutsArray(next, version),
          };
        }

        return { ...fallback, ...state };
      },
    }
  )
);
