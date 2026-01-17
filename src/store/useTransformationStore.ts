import type { Transformation } from '@/types/transformations';
import { DEFAULT_TRANSFORMATIONS } from '@/types/transformations';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chromeStorageAdapter } from './middleware/chromeStorage';

interface TransformationStore {
  transformations: Transformation[];
  _hasHydrated: boolean;

  addTransformation: (name: string, instructions: string) => Transformation;
  updateTransformation: (
    id: string,
    updates: Partial<Omit<Transformation, 'id' | 'createdAt'>>,
  ) => void;
  deleteTransformation: (id: string) => void;
  reorderTransformations: (orderedIds: string[]) => void;
  toggleEnabled: (id: string) => void;
  getEnabledTransformations: () => Transformation[];
  getTransformationById: (id: string) => Transformation | undefined;
  setHasHydrated: (state: boolean) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultTransformations(): Transformation[] {
  const now = Date.now();
  return DEFAULT_TRANSFORMATIONS.map((t, index) => ({
    ...t,
    id: generateId(),
    order: index,
    createdAt: now,
    updatedAt: now,
  }));
}

export const useTransformationStore = create<TransformationStore>()(
  persist(
    (set, get) => ({
      transformations: [],
      _hasHydrated: false,

      addTransformation: (name, instructions) => {
        const now = Date.now();
        const transformations = get().transformations;
        const maxOrder =
          transformations.length > 0 ? Math.max(...transformations.map((t) => t.order)) : -1;

        const newTransformation: Transformation = {
          id: generateId(),
          name,
          instructions,
          enabled: true,
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          transformations: [...state.transformations, newTransformation],
        }));

        return newTransformation;
      },

      updateTransformation: (id, updates) => {
        set((state) => ({
          transformations: state.transformations.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
          ),
        }));
      },

      deleteTransformation: (id) => {
        set((state) => ({
          transformations: state.transformations.filter((t) => t.id !== id),
        }));
      },

      reorderTransformations: (orderedIds) => {
        set((state) => {
          const transformationMap = new Map(state.transformations.map((t) => [t.id, t]));

          const reordered = orderedIds
            .map((id, index) => {
              const transformation = transformationMap.get(id);
              if (transformation) {
                return { ...transformation, order: index, updatedAt: Date.now() };
              }
              return null;
            })
            .filter((t): t is Transformation => t !== null);

          // Add any transformations not in orderedIds at the end
          const orderedSet = new Set(orderedIds);
          const remaining = state.transformations
            .filter((t) => !orderedSet.has(t.id))
            .map((t, index) => ({
              ...t,
              order: reordered.length + index,
              updatedAt: Date.now(),
            }));

          return {
            transformations: [...reordered, ...remaining],
          };
        });
      },

      toggleEnabled: (id) => {
        set((state) => ({
          transformations: state.transformations.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled, updatedAt: Date.now() } : t,
          ),
        }));
      },

      getEnabledTransformations: () => {
        return get()
          .transformations.filter((t) => t.enabled)
          .sort((a, b) => a.order - b.order);
      },

      getTransformationById: (id) => {
        return get().transformations.find((t) => t.id === id);
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'browser-llm-transformations',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({
        transformations: state.transformations,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If no transformations exist after hydration, add defaults
          if (state.transformations.length === 0) {
            const defaults = createDefaultTransformations();
            state.transformations = defaults;
          }
          state.setHasHydrated(true);
        }
      },
      version: 1,
    },
  ),
);

/**
 * Get transformations directly from chrome.storage (for use in background script)
 */
export async function getTransformationsFromStorage(): Promise<Transformation[]> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const result = await chrome.storage.sync.get('browser-llm-transformations');
      const stored = result['browser-llm-transformations'];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state?.transformations) {
          return parsed.state.transformations;
        }
      }
    }
  } catch (error) {
    console.error('[Browser LLM] Error reading transformations from storage:', error);
  }

  // Return default transformations if none stored
  return createDefaultTransformations();
}

/**
 * Get a single transformation by ID from storage (for use in background script)
 */
export async function getTransformationByIdFromStorage(
  id: string,
): Promise<Transformation | undefined> {
  const transformations = await getTransformationsFromStorage();
  return transformations.find((t) => t.id === id);
}
