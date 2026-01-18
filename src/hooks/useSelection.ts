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
 * Get selection data from an input or textarea element.
 * window.getSelection() doesn't work for these elements - we need to use
 * the element's native selection properties.
 */
function getInputSelectionData(element: HTMLInputElement | HTMLTextAreaElement): SelectionData | null {
  const { selectionStart, selectionEnd, value } = element;

  // No selection or collapsed selection
  if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) {
    return null;
  }

  const text = value.substring(selectionStart, selectionEnd).trim();
  if (!text) {
    return null;
  }

  // Get the bounding rect of the input element as a fallback
  // (Getting exact selection rect in inputs is complex and browser-dependent)
  const rect = element.getBoundingClientRect();

  return {
    text,
    rect,
    isEditable: true,
    element,
  };
}

/**
 * Check if the active element is an input or textarea with selection
 */
function getActiveInputSelection(): SelectionData | null {
  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    // Only handle text-based inputs
    if (activeElement instanceof HTMLInputElement) {
      const textTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
      if (!textTypes.includes(activeElement.type)) {
        return null;
      }
    }
    return getInputSelectionData(activeElement);
  }

  return null;
}

/**
 * Hook to track text selection in the document.
 * Returns the selected text and its bounding rect for positioning overlays.
 *
 * Handles both regular text selection (via window.getSelection()) and
 * input/textarea selection (via element.selectionStart/End).
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
    // First, check for input/textarea selection (window.getSelection doesn't work for these)
    const inputSelection = getActiveInputSelection();
    if (inputSelection && inputSelection.text.length >= minLength) {
      return inputSelection;
    }

    // Fall back to window.getSelection for regular text and contentEditable
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

    // Listen for selection changes (works for contentEditable and regular text)
    document.addEventListener('selectionchange', handleSelectionChange);

    // Also handle mouseup for immediate feedback
    document.addEventListener('mouseup', handleSelectionChange);

    // Handle keyboard selection in input/textarea (Shift+Arrow, Ctrl+Shift+End, etc.)
    // The 'select' event fires when selection changes in input/textarea
    document.addEventListener('select', handleSelectionChange);

    // Also handle keyup for keyboard-based selection (backup for select event)
    const handleKeyUp = (e: KeyboardEvent) => {
      // Only track selection-related keys
      if (
        e.shiftKey ||
        e.key === 'a' && (e.ctrlKey || e.metaKey) // Ctrl/Cmd+A
      ) {
        handleSelectionChange();
      }
    };
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('select', handleSelectionChange);
      document.removeEventListener('keyup', handleKeyUp);
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
