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
 * Check if a keyboard event has "safe" modifiers that won't conflict with
 * common text editing shortcuts in input fields.
 *
 * Safe combinations (rarely used by browsers/OS for text editing):
 * - Alt + any key (except Alt+Backspace on Mac)
 * - Ctrl/Cmd + Shift + letter (some conflict, but mostly safe)
 * - Any modifier combo with function keys
 */
function hasSafeModifiers(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();

  // Function keys are always safe with any modifiers
  if (/^f\d+$/.test(key)) {
    return true;
  }

  // Alt key combinations are generally safe for custom shortcuts
  // (browsers rarely use Alt+letter for text editing)
  if (event.altKey) {
    return true;
  }

  // Ctrl+Shift or Cmd+Shift combinations are mostly safe
  // (except a few like Ctrl+Shift+Z for redo)
  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  if (ctrlOrMeta && event.shiftKey) {
    // These specific combos conflict with common editor shortcuts
    const conflictKeys = ['z', 'y', 'a']; // redo, redo (Windows), select all
    return !conflictKeys.includes(key);
  }

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

  const { hasSelection, isEditable } = useSelection({ minLength: 1 });

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

      // Handle editable fields logic:
      // - If disableInEditableFields is true AND we're in an editable field:
      //   - Still allow if there's text selected AND the shortcut uses safe modifiers
      //   - This enables text transformation use cases (like Grammarly, Notion, etc.)
      const inEditableField = isEditable || isEditableElement(document.activeElement);
      if (disableInEditableFields && inEditableField) {
        // Allow shortcuts in editable fields only if:
        // 1. Text is actually selected (user wants to transform it)
        // 2. The shortcut uses safe modifiers (won't conflict with typing)
        if (!hasSelection || !hasSafeModifiers(event)) {
          return;
        }
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
      isEditable,
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
