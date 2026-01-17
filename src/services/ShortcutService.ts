import {
  isMac,
  MAC_MODIFIER_SYMBOLS,
  WINDOWS_MODIFIER_LABELS,
  RESERVED_KEYS,
  SYSTEM_CONFLICT_SHORTCUTS,
  SPECIAL_KEY_DISPLAY_NAMES,
} from '@/constants/shortcuts';
import type {
  KeyboardShortcut,
  ParsedShortcut,
  ShortcutValidationResult,
} from '@/types/shortcuts';

/**
 * Parse a shortcut string (e.g., "ctrl+shift+t") into a structured object
 */
export function parseShortcut(keys: string): ParsedShortcut | null {
  if (!keys || typeof keys !== 'string') {
    return null;
  }

  const parts = keys.toLowerCase().trim().split('+');
  if (parts.length === 0) {
    return null;
  }

  const modifiers = new Set<string>();
  let mainKey = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (['ctrl', 'control'].includes(trimmed)) {
      modifiers.add('ctrl');
    } else if (['shift'].includes(trimmed)) {
      modifiers.add('shift');
    } else if (['alt', 'option'].includes(trimmed)) {
      modifiers.add('alt');
    } else if (['meta', 'cmd', 'command', 'win', 'super'].includes(trimmed)) {
      modifiers.add('meta');
    } else {
      // This is the main key
      if (mainKey) {
        // Multiple main keys - invalid
        return null;
      }
      mainKey = trimmed;
    }
  }

  // Must have at least a main key
  if (!mainKey) {
    return null;
  }

  return {
    key: mainKey,
    ctrl: modifiers.has('ctrl'),
    shift: modifiers.has('shift'),
    alt: modifiers.has('alt'),
    meta: modifiers.has('meta'),
  };
}

/**
 * Convert a keyboard event to a shortcut string
 */
export function eventToShortcutString(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey || (isMac && event.metaKey)) {
    parts.push('ctrl');
  }
  if (event.shiftKey) {
    parts.push('shift');
  }
  if (event.altKey) {
    parts.push('alt');
  }
  // Only include meta separately if it's not being treated as ctrl on Mac
  if (event.metaKey && !isMac) {
    parts.push('meta');
  }

  // Get the main key (normalize it)
  const key = event.key.toLowerCase();

  // Skip if only modifiers pressed
  if (['control', 'shift', 'alt', 'meta'].includes(key)) {
    return '';
  }

  parts.push(key);
  return parts.join('+');
}

/**
 * Check if a keyboard event matches a parsed shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ParsedShortcut
): boolean {
  // On Mac, treat Cmd as equivalent to Ctrl
  const ctrlPressed = event.ctrlKey || (isMac && event.metaKey);

  if (shortcut.ctrl !== ctrlPressed) return false;
  if (shortcut.shift !== event.shiftKey) return false;
  if (shortcut.alt !== event.altKey) return false;
  // For meta, only check on non-Mac (Mac uses it as Ctrl)
  if (!isMac && shortcut.meta !== event.metaKey) return false;

  // Check the main key
  const eventKey = event.key.toLowerCase();
  return eventKey === shortcut.key;
}

/**
 * Validate a shortcut string against existing shortcuts
 */
export function validateShortcut(
  keys: string,
  existingShortcuts: KeyboardShortcut[],
  excludeId?: string
): ShortcutValidationResult {
  // Parse the shortcut
  const parsed = parseShortcut(keys);
  if (!parsed) {
    return {
      valid: false,
      error: {
        type: 'invalid_format',
        message: 'Invalid shortcut format. Use format like "ctrl+shift+t".',
      },
    };
  }

  // Check for reserved keys
  if (RESERVED_KEYS.includes(parsed.key as (typeof RESERVED_KEYS)[number])) {
    return {
      valid: false,
      error: {
        type: 'reserved_key',
        message: `"${parsed.key}" is a reserved key and cannot be used.`,
      },
    };
  }

  // Check if modifier is required (letters and numbers need modifiers)
  const isLetter = /^[a-z]$/.test(parsed.key);
  const isNumber = /^[0-9]$/.test(parsed.key);
  const hasModifier = parsed.ctrl || parsed.shift || parsed.alt || parsed.meta;

  if ((isLetter || isNumber) && !hasModifier) {
    return {
      valid: false,
      error: {
        type: 'missing_modifier',
        message: 'Letters and numbers require at least one modifier (Ctrl, Shift, Alt, or Cmd/Win).',
      },
    };
  }

  // Check for duplicates
  const normalizedKeys = normalizeShortcutString(keys);
  for (const existing of existingShortcuts) {
    if (excludeId && existing.id === excludeId) {
      continue;
    }
    if (normalizeShortcutString(existing.keys) === normalizedKeys) {
      return {
        valid: false,
        error: {
          type: 'duplicate',
          existingShortcut: existing,
        },
      };
    }
  }

  // Check for system conflicts (warn but allow)
  const conflictDescription = SYSTEM_CONFLICT_SHORTCUTS[normalizedKeys];
  if (conflictDescription) {
    return {
      valid: true,
      error: {
        type: 'system_conflict',
        conflictDescription,
      },
    };
  }

  return { valid: true };
}

/**
 * Normalize a shortcut string for comparison (consistent order)
 */
export function normalizeShortcutString(keys: string): string {
  const parsed = parseShortcut(keys);
  if (!parsed) return keys.toLowerCase();

  const parts: string[] = [];
  if (parsed.ctrl) parts.push('ctrl');
  if (parsed.shift) parts.push('shift');
  if (parsed.alt) parts.push('alt');
  if (parsed.meta) parts.push('meta');
  parts.push(parsed.key);

  return parts.join('+');
}

/**
 * Format a shortcut string for display (platform-aware)
 */
export function formatShortcutForDisplay(keys: string): string {
  const parsed = parseShortcut(keys);
  if (!parsed) return keys;

  const parts: string[] = [];

  if (isMac) {
    // Mac: Use symbols, order is Control, Option, Shift, Command
    if (parsed.ctrl) parts.push(MAC_MODIFIER_SYMBOLS.ctrl);
    if (parsed.alt) parts.push(MAC_MODIFIER_SYMBOLS.alt);
    if (parsed.shift) parts.push(MAC_MODIFIER_SYMBOLS.shift);
    if (parsed.meta) parts.push(MAC_MODIFIER_SYMBOLS.meta);
  } else {
    // Windows/Linux: Use text labels
    if (parsed.ctrl) parts.push(WINDOWS_MODIFIER_LABELS.ctrl);
    if (parsed.shift) parts.push(WINDOWS_MODIFIER_LABELS.shift);
    if (parsed.alt) parts.push(WINDOWS_MODIFIER_LABELS.alt);
    if (parsed.meta) parts.push(WINDOWS_MODIFIER_LABELS.meta);
  }

  // Format the main key
  let displayKey = parsed.key;

  // Check for special key display names
  const specialName = SPECIAL_KEY_DISPLAY_NAMES[parsed.key];
  if (specialName) {
    displayKey = specialName;
  } else if (parsed.key.length === 1) {
    // Single character - uppercase for display
    displayKey = parsed.key.toUpperCase();
  } else if (parsed.key.startsWith('f') && /^f\d+$/.test(parsed.key)) {
    // Function keys
    displayKey = parsed.key.toUpperCase();
  }

  parts.push(displayKey);

  // Mac uses no separator, Windows/Linux uses +
  return isMac ? parts.join('') : parts.join('+');
}

/**
 * Check if a keyboard event is a modifier-only keypress
 */
export function isModifierOnlyEvent(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return ['control', 'shift', 'alt', 'meta'].includes(key);
}

/**
 * Get currently pressed modifiers from a keyboard event
 */
export function getModifiersFromEvent(event: KeyboardEvent): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey || (isMac && event.metaKey)) modifiers.push('ctrl');
  if (event.shiftKey) modifiers.push('shift');
  if (event.altKey) modifiers.push('alt');
  if (event.metaKey && !isMac) modifiers.push('meta');
  return modifiers;
}
