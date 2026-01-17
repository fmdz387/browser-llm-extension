import { useEffect, useCallback } from 'react';
import { parseShortcut, matchesShortcut } from '@/services/ShortcutService';
import { useShortcutStore } from '@/store/useShortcutStore';
import { useSelection } from './useSelection';
import type { KeyboardShortcut } from '@/types/shortcuts';

interface UseKeyboardShortcutsOptions {
  onShortcutTriggered: (shortcut: KeyboardShortcut) => void;
  enabled?: boolean;
}

/** Check if an element is editable (input, textarea, contenteditable) */
function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return false;
}

/**
 * Hook to handle keyboard shortcuts for the content script
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { onShortcutTriggered, enabled = true } = options;

  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const globalEnabled = useShortcutStore((state) => state.globalEnabled);
  const requireTextSelection = useShortcutStore((state) => state.requireTextSelection);
  const disableInEditableFields = useShortcutStore((state) => state.disableInEditableFields);

  const { hasSelection } = useSelection({ minLength: 1 });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if globally disabled or hook is disabled
      if (!enabled || !globalEnabled) {
        return;
      }

      // Skip if it's a repeat event (key held down)
      if (event.repeat) {
        return;
      }

      // Skip modifier-only keypresses
      const key = event.key.toLowerCase();
      if (['control', 'shift', 'alt', 'meta'].includes(key)) {
        return;
      }

      // Check if we should skip based on settings
      if (requireTextSelection && !hasSelection) {
        return;
      }

      // Check focused element directly - more reliable than selection-based check
      if (disableInEditableFields && isEditableElement(document.activeElement)) {
        return;
      }

      // Find matching shortcut
      const enabledShortcuts = shortcuts.filter((s) => s.enabled);

      for (const shortcut of enabledShortcuts) {
        const parsed = parseShortcut(shortcut.keys);
        if (!parsed) continue;

        if (matchesShortcut(event, parsed)) {
          // Prevent default browser behavior
          event.preventDefault();
          event.stopPropagation();

          // Trigger the callback
          onShortcutTriggered(shortcut);
          return;
        }
      }
    },
    [
      enabled,
      globalEnabled,
      requireTextSelection,
      disableInEditableFields,
      hasSelection,
      shortcuts,
      onShortcutTriggered,
    ]
  );

  useEffect(() => {
    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
}
