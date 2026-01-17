import { useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/hooks';
import { ResultOverlay } from './ResultOverlay';

type ActionType = 'translate' | 'improve' | 'grammar' | 'transform' | null;

export function App() {
  const { text, rect, isEditable, element, hasSelection, clearSelection } = useSelection({
    minLength: 3,
  });

  const [action, setAction] = useState<ActionType>(null);
  const [transformationId, setTransformationId] = useState<string | null>(null);
  const [frozenSelection, setFrozenSelection] = useState<{
    text: string;
    rect: DOMRect | null;
    isEditable: boolean;
    element: HTMLElement | null;
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
          setFrozenSelection({
            text,
            rect,
            isEditable,
            element,
          });
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
          // Freeze the current selection
          setFrozenSelection({
            text,
            rect,
            isEditable,
            element,
          });
          setTransformationId(null);
          setAction(newAction);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [hasSelection, text, rect, isEditable, element]);

  const handleClose = useCallback(() => {
    setAction(null);
    setTransformationId(null);
    setFrozenSelection(null);
    clearSelection();
  }, [clearSelection]);

  const handleReplace = useCallback(
    (newText: string) => {
      const targetElement = frozenSelection?.element;

      if (!targetElement) return;

      // Handle different element types
      if (
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'TEXTAREA'
      ) {
        const input = targetElement as HTMLInputElement | HTMLTextAreaElement;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const value = input.value;

        input.value = value.slice(0, start) + newText + value.slice(end);

        // Trigger input event for frameworks that listen to it
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (targetElement.isContentEditable) {
        // For contenteditable elements
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(newText));
        } else {
          // Fallback: use execCommand
          document.execCommand('insertText', false, newText);
        }
      }
    },
    [frozenSelection]
  );

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
          onReplace={activeSelection.isEditable ? handleReplace : undefined}
          isEditable={activeSelection.isEditable}
        />
      )}
    </>
  );
}
