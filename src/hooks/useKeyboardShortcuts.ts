import { useEffect, useCallback } from 'react';
import { parseShortcut, matchesShortcut, eventToCanonicalKey } from '@/services/ShortcutService';
import { useShortcutStore } from '@/store/useShortcutStore';
import { isMac } from '@/constants/shortcuts';
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
 * Whether a keyboard event uses modifiers that are safe to intercept while a
 * user is typing in an input / textarea / contenteditable.
 *
 * Platform-aware:
 *  - macOS: Option ⌥ alone is NOT safe — Option+letter is how Mac users type
 *    accented characters and symbols (⌥E → ´, ⌥U → ¨, ⌥T → †, ⌥G → ©, ...).
 *    Safe combos require Command (⌘) or Control. Cmd+letter mostly maps to
 *    app actions (Cmd+B = bold, Cmd+I = italic, Cmd+S = save) so we require
 *    Cmd+Shift or Cmd+Option (or any combo with Ctrl) to avoid clobbering
 *    rich-text editors.
 *  - Windows/Linux: Alt+letter is safe (browsers rarely use it for text
 *    editing). Ctrl+Shift combos are safe except for the few standard editor
 *    bindings we exclude below.
 */
function hasSafeModifiersInEditable(event: KeyboardEvent): boolean {
  const canonicalKey = eventToCanonicalKey(event);
  if (!canonicalKey) return false;

  // Function keys are always safe with any modifiers
  if (/^f\d+$/.test(canonicalKey)) {
    return true;
  }

  if (isMac) {
    // Cmd-based combos: require an additional modifier (Shift or Option),
    // OR fall through to allow any Ctrl-based combo, to keep the most common
    // rich-text shortcuts (Cmd+B/I/U/S/Z/A/C/V/X) intact.
    if (event.metaKey && (event.shiftKey || event.altKey || event.ctrlKey)) {
      return true;
    }
    // Ctrl-only combos collide with macOS Emacs-style bindings (Ctrl+A/E/K/T)
    // so require an extra modifier.
    if (event.ctrlKey && (event.shiftKey || event.altKey)) {
      return true;
    }
    return false;
  }

  // Windows / Linux
  // Alt+anything is generally safe.
  if (event.altKey) {
    return true;
  }

  // Ctrl+Shift combos are safe except for editor conflicts (Ctrl+Shift+Z = redo)
  if (event.ctrlKey && event.shiftKey) {
    const conflictKeys = ['z', 'y', 'a'];
    return !conflictKeys.includes(canonicalKey);
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
      if (!enabled || !globalEnabled) return;

      // Skip auto-repeat events
      if (event.repeat) return;

      // Skip modifier-only keypresses
      const key = event.key.toLowerCase();
      if (['control', 'shift', 'alt', 'meta', 'os', 'altgraph'].includes(key)) {
        return;
      }

      if (requireTextSelection && !hasSelection) return;

      // Editable-field gate
      const inEditableField = isEditable || isEditableElement(document.activeElement);
      if (disableInEditableFields && inEditableField) {
        if (!hasSelection || !hasSafeModifiersInEditable(event)) {
          return;
        }
      }

      // Match against configured shortcuts
      const enabledShortcuts = shortcuts.filter((s) => s.enabled);
      for (const shortcut of enabledShortcuts) {
        const parsed = parseShortcut(shortcut.keys);
        if (!parsed) continue;

        if (matchesShortcut(event, parsed)) {
          event.preventDefault();
          event.stopPropagation();
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
