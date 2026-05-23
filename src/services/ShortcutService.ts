import {
  isMac,
  MAC_MODIFIER_SYMBOLS,
  MODIFIER_NAMES,
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
 * Convert a KeyboardEvent into the canonical main-key portion of a shortcut.
 *
 * For letters / digits / F-keys we use `event.code` rather than `event.key`,
 * because on macOS with the Option modifier `event.key` resolves to the
 * composed character (⌥T → "†"). `event.code` is layout-independent and
 * always reports the physical key (KeyT, Digit5, F3).
 *
 * For special keys (arrows, Escape, Enter, etc.) we use `event.key`.
 */
export function eventToCanonicalKey(event: KeyboardEvent): string | null {
  const code = event.code;

  // Letter keys: KeyA..KeyZ -> a..z
  if (code && code.length === 4 && code.startsWith('Key')) {
    return code.charAt(3).toLowerCase();
  }
  // Digit keys: Digit0..Digit9 -> 0..9
  if (code && code.startsWith('Digit') && code.length === 6) {
    return code.charAt(5);
  }
  // Numpad digits: Numpad0..Numpad9 -> 0..9 (treat as the digit)
  if (code && code.startsWith('Numpad') && /^Numpad[0-9]$/.test(code)) {
    return code.charAt(6);
  }
  // F-keys: F1..F24
  if (code && /^F\d{1,2}$/.test(code)) {
    return code.toLowerCase();
  }

  // Fallback to event.key for special keys (arrows, Enter, Escape, etc.)
  const key = event.key;
  if (!key) return null;
  const lower = key.toLowerCase();

  // Skip modifier-only keys
  if (['control', 'shift', 'alt', 'meta', 'os', 'altgraph'].includes(lower)) {
    return null;
  }

  // Normalize " " -> "space"
  if (lower === ' ') return 'space';

  return lower;
}

/**
 * Parse a shortcut string (e.g., "cmdorctrl+shift+t") into a structured object.
 * Tokens are case-insensitive and order-insensitive.
 *
 * Recognized modifier tokens:
 *  - ctrl / control
 *  - shift
 *  - alt / option / opt
 *  - meta / cmd / command / win / super
 *  - cmdorctrl / mod / accel  (smart cross-platform)
 */
export function parseShortcut(keys: string): ParsedShortcut | null {
  if (!keys || typeof keys !== 'string') {
    return null;
  }

  const parts = keys.toLowerCase().trim().split('+');
  if (parts.length === 0) {
    return null;
  }

  let ctrl = false;
  let shift = false;
  let alt = false;
  let meta = false;
  let cmdorctrl = false;
  let mainKey = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed === 'ctrl' || trimmed === 'control') {
      ctrl = true;
    } else if (trimmed === 'shift') {
      shift = true;
    } else if (trimmed === 'alt' || trimmed === 'option' || trimmed === 'opt') {
      alt = true;
    } else if (
      trimmed === 'meta' ||
      trimmed === 'cmd' ||
      trimmed === 'command' ||
      trimmed === 'win' ||
      trimmed === 'super'
    ) {
      meta = true;
    } else if (trimmed === 'cmdorctrl' || trimmed === 'mod' || trimmed === 'accel') {
      cmdorctrl = true;
    } else {
      // Main key
      if (mainKey) return null; // multiple main keys -> invalid
      mainKey = trimmed;
    }
  }

  if (!mainKey) return null;

  return { key: mainKey, ctrl, shift, alt, meta, cmdorctrl };
}

/**
 * Convert a keyboard event to the canonical shortcut string.
 * Output uses lowercase modifier tokens in fixed order so two presses of the
 * same combination always serialize identically.
 */
export function eventToShortcutString(event: KeyboardEvent): string {
  const canonicalKey = eventToCanonicalKey(event);
  if (!canonicalKey) return '';

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  parts.push(canonicalKey);

  return parts.join('+');
}

/**
 * Check if a keyboard event matches a parsed shortcut.
 *
 * `cmdorctrl` token:
 *   - on Mac matches the Command (meta) key
 *   - on Windows/Linux matches the Control key
 *
 * Other modifier tokens match their physical key on all platforms.
 *
 * Main-key matching is done via `eventToCanonicalKey`, which uses
 * `event.code` for letters/digits/F-keys (Mac Option dead-key safe).
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ParsedShortcut
): boolean {
  // Resolve effective modifier requirements
  const ctrlRequired = shortcut.ctrl || (shortcut.cmdorctrl && !isMac);
  const metaRequired = shortcut.meta || (shortcut.cmdorctrl && isMac);

  if (event.ctrlKey !== ctrlRequired) return false;
  if (event.metaKey !== metaRequired) return false;
  if (event.altKey !== shortcut.alt) return false;
  if (event.shiftKey !== shortcut.shift) return false;

  const eventKey = eventToCanonicalKey(event);
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
        message: 'Invalid shortcut format. Use a combination like "Ctrl+Shift+T".',
      },
    };
  }

  // Check for reserved keys
  if (RESERVED_KEYS.includes(parsed.key as (typeof RESERVED_KEYS)[number])) {
    return {
      valid: false,
      error: {
        type: 'reserved_key',
        message: `"${parsed.key}" is reserved and cannot be used as a shortcut key.`,
      },
    };
  }

  // Letters/numbers require at least one modifier (otherwise they'd intercept typing)
  const isLetter = /^[a-z]$/.test(parsed.key);
  const isNumber = /^[0-9]$/.test(parsed.key);
  const hasModifier =
    parsed.ctrl || parsed.shift || parsed.alt || parsed.meta || parsed.cmdorctrl;

  if ((isLetter || isNumber) && !hasModifier) {
    const modList = isMac
      ? `${MODIFIER_NAMES.ctrl}, ${MODIFIER_NAMES.alt}, ${MODIFIER_NAMES.shift}, or ${MODIFIER_NAMES.meta}`
      : `${MODIFIER_NAMES.ctrl}, ${MODIFIER_NAMES.alt}, ${MODIFIER_NAMES.shift}, or ${MODIFIER_NAMES.meta}`;
    return {
      valid: false,
      error: {
        type: 'missing_modifier',
        message: `Letters and numbers require at least one modifier (${modList}).`,
      },
    };
  }

  // Check for duplicates
  const normalizedKeys = normalizeShortcutString(keys);
  for (const existing of existingShortcuts) {
    if (excludeId && existing.id === excludeId) continue;
    if (normalizeShortcutString(existing.keys) === normalizedKeys) {
      return {
        valid: false,
        error: { type: 'duplicate', existingShortcut: existing },
      };
    }
  }

  // System conflict warning (non-fatal)
  const conflictDescription = lookupSystemConflict(parsed);
  if (conflictDescription) {
    return {
      valid: true,
      error: { type: 'system_conflict', conflictDescription },
    };
  }

  return { valid: true };
}

/**
 * Look up a parsed shortcut in the platform-specific system conflict table.
 * Tries multiple representations of cmdorctrl to catch all forms.
 */
function lookupSystemConflict(parsed: ParsedShortcut): string | undefined {
  const candidates = new Set<string>();
  candidates.add(serializeForConflictLookup(parsed));

  // If cmdorctrl is set, also check the resolved physical-key form on this OS
  if (parsed.cmdorctrl) {
    const resolved: ParsedShortcut = {
      ...parsed,
      cmdorctrl: false,
      ctrl: isMac ? parsed.ctrl : true,
      meta: isMac ? true : parsed.meta,
    };
    candidates.add(serializeForConflictLookup(resolved));
  }

  for (const c of candidates) {
    if (SYSTEM_CONFLICT_SHORTCUTS[c]) return SYSTEM_CONFLICT_SHORTCUTS[c];
  }
  return undefined;
}

function serializeForConflictLookup(parsed: ParsedShortcut): string {
  const parts: string[] = [];
  if (parsed.ctrl) parts.push('ctrl');
  if (parsed.alt) parts.push('alt');
  if (parsed.shift) parts.push('shift');
  if (parsed.meta) parts.push('meta');
  parts.push(parsed.key);
  return parts.join('+');
}

/**
 * Normalize a shortcut string for comparison (consistent order, no aliases).
 * Output order: cmdorctrl, ctrl, alt, shift, meta, key.
 */
export function normalizeShortcutString(keys: string): string {
  const parsed = parseShortcut(keys);
  if (!parsed) return keys.toLowerCase();

  const parts: string[] = [];
  if (parsed.cmdorctrl) parts.push('cmdorctrl');
  if (parsed.ctrl) parts.push('ctrl');
  if (parsed.alt) parts.push('alt');
  if (parsed.shift) parts.push('shift');
  if (parsed.meta) parts.push('meta');
  parts.push(parsed.key);

  return parts.join('+');
}

/**
 * Format a shortcut string for display (platform-aware).
 *
 * On macOS we use the standard Apple HIG symbols in HIG order:
 *   Control, Option, Shift, Command — joined with no separator.
 *
 * On Windows/Linux we use textual labels joined with "+".
 *
 * `cmdorctrl` is rendered as ⌘ on Mac and "Ctrl" on Win/Linux.
 */
export function formatShortcutForDisplay(keys: string): string {
  const parsed = parseShortcut(keys);
  if (!parsed) return keys;

  const parts: string[] = [];

  if (isMac) {
    // Apple HIG order: Control, Option, Shift, Command
    if (parsed.ctrl) parts.push(MAC_MODIFIER_SYMBOLS.ctrl);
    if (parsed.alt) parts.push(MAC_MODIFIER_SYMBOLS.alt);
    if (parsed.shift) parts.push(MAC_MODIFIER_SYMBOLS.shift);
    if (parsed.cmdorctrl || parsed.meta) parts.push(MAC_MODIFIER_SYMBOLS.meta);
  } else {
    if (parsed.cmdorctrl || parsed.ctrl) parts.push(WINDOWS_MODIFIER_LABELS.ctrl);
    if (parsed.alt) parts.push(WINDOWS_MODIFIER_LABELS.alt);
    if (parsed.shift) parts.push(WINDOWS_MODIFIER_LABELS.shift);
    if (parsed.meta) parts.push(WINDOWS_MODIFIER_LABELS.meta);
  }

  // Format the main key
  let displayKey = parsed.key;

  const specialName = SPECIAL_KEY_DISPLAY_NAMES[parsed.key];
  if (specialName) {
    displayKey = specialName;
  } else if (parsed.key.length === 1) {
    displayKey = parsed.key.toUpperCase();
  } else if (/^f\d+$/.test(parsed.key)) {
    displayKey = parsed.key.toUpperCase();
  }

  parts.push(displayKey);

  return isMac ? parts.join('') : parts.join('+');
}

/**
 * Check if a keyboard event is a modifier-only keypress
 */
export function isModifierOnlyEvent(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return ['control', 'shift', 'alt', 'meta', 'os', 'altgraph'].includes(key);
}

/**
 * Get currently pressed modifiers (as platform-aware display tokens).
 * Used by the recorder to show which modifiers are held.
 */
export function getModifiersFromEvent(event: KeyboardEvent): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  return modifiers;
}

/**
 * Migrate a legacy shortcut string (pre-v4) to the new canonical format.
 *
 * Pre-v4 format folded Mac Cmd into "ctrl", so any user-customized
 * "ctrl+X" represented either:
 *   - Real Control on Windows (their intent), or
 *   - Real Command on Mac (their intent, but stored as ctrl).
 *
 * To preserve that "this should work like a primary modifier" semantic across
 * platforms, we promote any pre-v4 `ctrl+...` shortcut to `cmdorctrl+...`.
 * Default shortcuts (alt+t/c/g) are replaced by callers via the store's
 * version-bump migration; everything else is converted here.
 */
export function migrateLegacyShortcutString(keys: string): string {
  if (!keys) return keys;
  const lower = keys.toLowerCase().trim();
  // Already in new format
  if (lower.includes('cmdorctrl') || lower.includes('meta')) {
    return normalizeShortcutString(keys);
  }
  // Promote ctrl -> cmdorctrl for cross-platform intent preservation
  if (/(^|\+)ctrl(\+|$)/.test(lower)) {
    return normalizeShortcutString(lower.replace(/(^|\+)ctrl(\+|$)/, '$1cmdorctrl$2'));
  }
  return normalizeShortcutString(keys);
}
