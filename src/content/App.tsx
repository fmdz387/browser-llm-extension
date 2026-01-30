import { useEffect, useCallback } from 'react';
import { useSelection, useKeyboardShortcuts, useTransformationAction } from '@/hooks';
import type { KeyboardShortcut } from '@/types/shortcuts';
import { sendMessage } from '@/utils/messaging';
import { ResultOverlay } from './ResultOverlay';
import { setMessageHandler, clearMessageHandler } from './index';

export function App() {
  const { text, rect, hasSelection, clearSelection } = useSelection({ minLength: 3 });
  const {
    action,
    transformationInfo,
    frozenSelection,
    ocrData,
    triggerTransformation,
    triggerBuiltinAction,
    triggerOCR,
    clearAction,
  } = useTransformationAction();

  // Handle OCR from image URL (for context menu)
  // Uses background script to fetch image (bypasses CORS restrictions)
  const handleImageUrlOCR = useCallback(async (imageUrl: string, clickPosition?: { x: number; y: number }) => {
    try {
      // Fetch image via background script (has more permissions)
      const response = await sendMessage({
        type: 'FETCH_IMAGE',
        payload: { imageUrl },
      });

      if (!response.success) {
        console.warn('[Browser LLM] Image fetch failed:', response.error.message);
        return;
      }

      const { imageData, mimeType } = response.data as { imageData: string; mimeType: string };

      triggerOCR({
        imageData,
        mimeType,
        source: 'url',
      }, clickPosition);
    } catch (err) {
      console.error('[Browser LLM] handleImageUrlOCR error:', err);
    }
  }, [triggerOCR]);

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

  // Handle context menu messages via global listener (set up in index.tsx)
  useEffect(() => {
    const handleMessage = (message: { type: string; action?: string; transformationId?: string; imageUrl?: string }) => {
      // OCR action from context menu (right-click on image)
      if (message.action === 'ocr' && message.imageUrl) {
        handleImageUrlOCR(message.imageUrl);
        return;
      }

      // Other actions require text selection
      if (!hasSelection) return;
      const selection = { text, rect };

      if (message.action === 'transform' && message.transformationId) {
        triggerTransformation(message.transformationId, selection);
      } else if (message.action === 'translate' || message.action === 'improve' || message.action === 'grammar') {
        triggerBuiltinAction(message.action, selection);
      }
    };

    setMessageHandler(handleMessage);
    return () => clearMessageHandler();
  }, [hasSelection, text, rect, triggerTransformation, triggerBuiltinAction, handleImageUrlOCR]);

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
      ocrData={ocrData}
      onClose={handleClose}
    />
  );
}
