import { useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/hooks';
import { ResultOverlay } from './ResultOverlay';

type ActionType = 'translate' | 'improve' | 'grammar' | 'transform' | null;

export function App() {
  const { text, rect, hasSelection, clearSelection } = useSelection({
    minLength: 3,
  });

  const [action, setAction] = useState<ActionType>(null);
  const [transformationId, setTransformationId] = useState<string | null>(null);
  const [frozenSelection, setFrozenSelection] = useState<{
    text: string;
    rect: DOMRect | null;
  } | null>(null);

  // Listen for context menu actions from background script
  useEffect(() => {
    const handleMessage = (message: {
      type: string;
      action?: string;
      transformationId?: string;
    }) => {
      if (message.type === 'CONTEXT_MENU_ACTION' && hasSelection) {
        // Handle transform action with transformationId
        if (message.action === 'transform' && message.transformationId) {
          setFrozenSelection({ text, rect });
          setTransformationId(message.transformationId);
          setAction('transform');
          return;
        }

        // Handle legacy actions (translate, improve, grammar)
        const actionMap: Record<string, ActionType> = {
          translate: 'translate',
          improve: 'improve',
          grammar: 'grammar',
        };

        const newAction = actionMap[message.action || ''];
        if (newAction) {
          setFrozenSelection({ text, rect });
          setTransformationId(null);
          setAction(newAction);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [hasSelection, text, rect]);

  const handleClose = useCallback(() => {
    setAction(null);
    setTransformationId(null);
    setFrozenSelection(null);
    clearSelection();
  }, [clearSelection]);

  // Use frozen selection when action is active, otherwise use live selection
  const activeSelection = action && frozenSelection ? frozenSelection : null;

  return (
    <>
      {activeSelection && (
        <ResultOverlay
          selectedText={activeSelection.text}
          selectionRect={activeSelection.rect}
          action={action}
          transformationId={transformationId}
          onClose={handleClose}
        />
      )}
    </>
  );
}
