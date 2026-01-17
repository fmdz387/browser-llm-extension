import { useState, useEffect, useCallback } from 'react';

export interface SelectionData {
  text: string;
  rect: DOMRect | null;
  isEditable: boolean;
  element: HTMLElement | null;
}

interface UseSelectionOptions {
  minLength?: number;
  debounceMs?: number;
}

/**
 * Hook to track text selection in the document.
 * Returns the selected text and its bounding rect for positioning overlays.
 */
export function useSelection(options: UseSelectionOptions = {}) {
  const { minLength = 1, debounceMs = 150 } = options;

  const [selection, setSelection] = useState<SelectionData>({
    text: '',
    rect: null,
    isEditable: false,
    element: null,
  });

  const getSelectionData = useCallback((): SelectionData => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.rangeCount === 0) {
      return { text: '', rect: null, isEditable: false, element: null };
    }

    const text = windowSelection.toString().trim();

    if (text.length < minLength) {
      return { text: '', rect: null, isEditable: false, element: null };
    }

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Check if selection is in an editable element
    const anchorNode = windowSelection.anchorNode;
    const element = anchorNode?.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode as HTMLElement | null;

    const isEditable = element
      ? element.isContentEditable ||
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA'
      : false;

    return { text, rect, isEditable, element };
  }, [minLength]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleSelectionChange = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setSelection(getSelectionData());
      }, debounceMs);
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);

    // Also handle mouseup for immediate feedback
    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [getSelectionData, debounceMs]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection({ text: '', rect: null, isEditable: false, element: null });
  }, []);

  return {
    ...selection,
    hasSelection: selection.text.length >= minLength,
    clearSelection,
  };
}
