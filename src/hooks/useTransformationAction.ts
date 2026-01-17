import { useCallback, useState } from 'react';
import type { Transformation } from '@/types/transformations';

export type ActionType = 'translate' | 'improve' | 'grammar' | 'transform' | null;

export interface TransformationInfo {
  id: string;
  title?: string;
  description?: string;
}

interface SelectionData {
  text: string;
  rect: DOMRect | null;
}

interface TransformationActionState {
  action: ActionType;
  transformationInfo: TransformationInfo | null;
  frozenSelection: SelectionData | null;
}

interface UseTransformationActionReturn extends TransformationActionState {
  triggerTransformation: (transformationId: string, selection: SelectionData) => void;
  triggerBuiltinAction: (actionType: 'translate' | 'improve' | 'grammar', selection: SelectionData) => void;
  clearAction: () => void;
}

/**
 * Get transformation by ID directly from Chrome storage.
 * Used in content script where Zustand store may not be hydrated.
 */
async function getTransformationFromStorage(id: string): Promise<Transformation | undefined> {
  try {
    const result = await chrome.storage.sync.get('browser-llm-transformations');
    const stored = result['browser-llm-transformations'];
    if (stored) {
      const parsed = JSON.parse(stored);
      const transformations = parsed.state?.transformations as Transformation[] | undefined;
      return transformations?.find((t) => t.id === id);
    }
  } catch (e) {
    console.error('[Browser LLM] Error reading transformation from storage:', e);
  }
  return undefined;
}

/**
 * Hook to manage transformation actions for the content script.
 * Centralizes transformation data lookup and action state management.
 */
export function useTransformationAction(): UseTransformationActionReturn {
  const [state, setState] = useState<TransformationActionState>({
    action: null,
    transformationInfo: null,
    frozenSelection: null,
  });

  const triggerTransformation = useCallback((transformationId: string, selection: SelectionData) => {
    // Set initial state immediately, then update with full data from storage
    setState({
      action: 'transform',
      transformationInfo: { id: transformationId },
      frozenSelection: selection,
    });

    // Async lookup from Chrome storage (content script doesn't have hydrated Zustand store)
    getTransformationFromStorage(transformationId).then((transformation) => {
      if (transformation) {
        setState((prev) => ({
          ...prev,
          transformationInfo: {
            id: transformationId,
            title: transformation.title || transformation.name,
            description: transformation.description,
          },
        }));
      }
    });
  }, []);

  const triggerBuiltinAction = useCallback(
    (actionType: 'translate' | 'improve' | 'grammar', selection: SelectionData) => {
      setState({
        action: actionType,
        transformationInfo: null,
        frozenSelection: selection,
      });
    },
    []
  );

  const clearAction = useCallback(() => {
    setState({
      action: null,
      transformationInfo: null,
      frozenSelection: null,
    });
  }, []);

  return {
    ...state,
    triggerTransformation,
    triggerBuiltinAction,
    clearAction,
  };
}
