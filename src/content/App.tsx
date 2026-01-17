import { useEffect, useCallback } from 'react';
import { useSelection, useKeyboardShortcuts, useTransformationAction } from '@/hooks';
import type { KeyboardShortcut } from '@/types/shortcuts';
import { ResultOverlay } from './ResultOverlay';

export function App() {
  const { text, rect, hasSelection, clearSelection } = useSelection({ minLength: 3 });
  const {
    action,
    transformationInfo,
    frozenSelection,
    triggerTransformation,
    triggerBuiltinAction,
    clearAction,
  } = useTransformationAction();

  // Handle keyboard shortcuts
  const handleShortcut = useCallback(
    (shortcut: KeyboardShortcut) => {
      if (!hasSelection) return;
      const selection = { text, rect };

      if (shortcut.actionType === 'transformation') {
        triggerTransformation(shortcut.actionId, selection);
      } else if (shortcut.actionType === 'builtin') {
        const builtinAction = shortcut.actionId as 'translate' | 'improve' | 'grammar';
        triggerBuiltinAction(builtinAction, selection);
      }
    },
    [hasSelection, text, rect, triggerTransformation, triggerBuiltinAction]
  );

  useKeyboardShortcuts({ onShortcutTriggered: handleShortcut });

  // Handle context menu messages
  useEffect(() => {
    const handleMessage = (message: { type: string; action?: string; transformationId?: string }) => {
      if (message.type !== 'CONTEXT_MENU_ACTION' || !hasSelection) return;
      const selection = { text, rect };

      if (message.action === 'transform' && message.transformationId) {
        triggerTransformation(message.transformationId, selection);
      } else if (message.action === 'translate' || message.action === 'improve' || message.action === 'grammar') {
        triggerBuiltinAction(message.action, selection);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [hasSelection, text, rect, triggerTransformation, triggerBuiltinAction]);

  const handleClose = useCallback(() => {
    clearAction();
    clearSelection();
  }, [clearAction, clearSelection]);

  if (!action || !frozenSelection) return null;

  return (
    <ResultOverlay
      selectedText={frozenSelection.text}
      selectionRect={frozenSelection.rect}
      action={action}
      transformationId={transformationInfo?.id}
      transformationTitle={transformationInfo?.title}
      transformationDescription={transformationInfo?.description}
      onClose={handleClose}
    />
  );
}
