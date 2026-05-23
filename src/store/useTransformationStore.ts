import type { Transformation } from '@/types/transformations';
import { DEFAULT_TRANSFORMATIONS, DEFAULT_TRANSFORMATION_IDS } from '@/types/transformations';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chromeStorageAdapter } from './middleware/chromeStorage';

interface AddTransformationData {
  name: string;
  instructions: string;
  title?: string;
  description?: string;
}

interface TransformationStore {
  transformations: Transformation[];
  _hasHydrated: boolean;

  addTransformation: (data: AddTransformationData) => Transformation;
  updateTransformation: (id: string, updates: Partial<Omit<Transformation, 'id' | 'createdAt'>>) => void;
  deleteTransformation: (id: string) => void;
  reorderTransformations: (orderedIds: string[]) => void;
  toggleEnabled: (id: string) => void;
  getEnabledTransformations: () => Transformation[];
  getTransformationById: (id: string) => Transformation | undefined;
  setHasHydrated: (state: boolean) => void;
}

// Fixed IDs for default transformations (enables keyboard shortcuts)
const FIXED_IDS: Record<string, string> = {
  'Translate to English': DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
  'Fix Grammar': DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
  'Make Concise': DEFAULT_TRANSFORMATION_IDS.MAKE_CONCISE,
  'Translate to Urban English': DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_URBAN_ENGLISH,
};

function createDefaultTransformations(): Transformation[] {
  const now = Date.now();
  return DEFAULT_TRANSFORMATIONS.map((t) => ({ ...t, createdAt: now, updatedAt: now }));
}

function migrateToFixedIds(transformations: Transformation[]): Transformation[] {
  return transformations.map((t) => {
    const fixedId = FIXED_IDS[t.name];
    return fixedId && t.id !== fixedId ? { ...t, id: fixedId } : t;
  });
}

/**
 * Ensure every default transformation by fixed ID is present in the user's
 * list. Existing user transformations are preserved untouched. Any missing
 * default is appended at the end with a sensible order value so it shows up
 * in the right-click menu and can be triggered via its default shortcut.
 */
function ensureDefaultsPresent(transformations: Transformation[]): Transformation[] {
  const existingIds = new Set(transformations.map((t) => t.id));
  const missing = DEFAULT_TRANSFORMATIONS.filter((d) => !existingIds.has(d.id));
  if (missing.length === 0) return transformations;

  const now = Date.now();
  const maxOrder = transformations.length > 0 ? Math.max(...transformations.map((t) => t.order)) : -1;

  const additions = missing.map((d, i) => ({
    ...d,
    order: maxOrder + 1 + i,
    createdAt: now,
    updatedAt: now,
  }));

  return [...transformations, ...additions];
}

export const useTransformationStore = create<TransformationStore>()(
  persist(
    (set, get) => ({
      transformations: [],
      _hasHydrated: false,

      addTransformation: (data) => {
        const now = Date.now();
        const transformations = get().transformations;
        const maxOrder = transformations.length > 0 ? Math.max(...transformations.map((t) => t.order)) : -1;

        const newTransformation: Transformation = {
          id: crypto.randomUUID(),
          name: data.name,
          instructions: data.instructions,
          title: data.title,
          description: data.description,
          enabled: true,
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ transformations: [...state.transformations, newTransformation] }));
        return newTransformation;
      },

      updateTransformation: (id, updates) => {
        set((state) => ({
          transformations: state.transformations.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }));
      },

      deleteTransformation: (id) => {
        set((state) => ({ transformations: state.transformations.filter((t) => t.id !== id) }));
      },

      reorderTransformations: (orderedIds) => {
        set((state) => {
          const map = new Map(state.transformations.map((t) => [t.id, t]));
          const reordered = orderedIds
            .map((id, i) => (map.get(id) ? { ...map.get(id)!, order: i, updatedAt: Date.now() } : null))
            .filter((t): t is Transformation => t !== null);

          const remaining = state.transformations
            .filter((t) => !orderedIds.includes(t.id))
            .map((t, i) => ({ ...t, order: reordered.length + i, updatedAt: Date.now() }));

          return { transformations: [...reordered, ...remaining] };
        });
      },

      toggleEnabled: (id) => {
        set((state) => ({
          transformations: state.transformations.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled, updatedAt: Date.now() } : t
          ),
        }));
      },

      getEnabledTransformations: () => {
        return get().transformations.filter((t) => t.enabled).sort((a, b) => a.order - b.order);
      },

      getTransformationById: (id) => {
        return get().transformations.find((t) => t.id === id);
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'browser-llm-transformations',
      storage: createJSONStorage(() => chromeStorageAdapter),
      partialize: (state) => ({ transformations: state.transformations }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.transformations.length === 0) {
            state.transformations = createDefaultTransformations();
          } else {
            state.transformations = ensureDefaultsPresent(migrateToFixedIds(state.transformations));
          }
          state.setHasHydrated(true);
        }
      },
      version: 3,
      migrate: (persisted: unknown) => {
        const s = persisted as { transformations?: Transformation[] };
        if (s.transformations) {
          s.transformations = ensureDefaultsPresent(migrateToFixedIds(s.transformations));
        }
        return s;
      },
    }
  )
);

/** Get transformations from storage (for background script) */
export async function getTransformationsFromStorage(): Promise<Transformation[]> {
  try {
    const result = await chrome.storage.sync.get('browser-llm-transformations');
    const stored = result['browser-llm-transformations'];
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.transformations) {
        return migrateToFixedIds(parsed.state.transformations);
      }
    }
  } catch (e) {
    console.error('[Browser LLM] Error reading transformations:', e);
  }
  return createDefaultTransformations();
}

/** Get single transformation by ID from storage (for background script) */
export async function getTransformationByIdFromStorage(id: string): Promise<Transformation | undefined> {
  const transformations = await getTransformationsFromStorage();
  return transformations.find((t) => t.id === id);
}
