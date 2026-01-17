import { useCallback, useState } from 'react';
import { useTransformationStore } from '@/store/useTransformationStore';

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
    // Get transformation data directly from store
    const transformation = useTransformationStore.getState().getTransformationById(transformationId);

    setState({
      action: 'transform',
      transformationInfo: {
        id: transformationId,
        title: transformation?.title || transformation?.name,
        description: transformation?.description,
      },
      frozenSelection: selection,
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
