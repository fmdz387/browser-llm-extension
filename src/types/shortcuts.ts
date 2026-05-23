/**
 * Modifier key tokens used in the canonical shortcut string format.
 *
 *  - `ctrl`       — physical Control key (⌃ on Mac, Ctrl on Win/Linux).
 *  - `alt`        — Option ⌥ on Mac, Alt on Win/Linux.
 *  - `shift`      — Shift.
 *  - `meta`       — Command ⌘ on Mac, Win/Super on Win/Linux.
 *  - `cmdorctrl`  — smart token: matches ⌘ on Mac, Ctrl on Win/Linux.
 *                   This is the Electron / VS Code convention for
 *                   cross-platform default bindings.
 */
export type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta' | 'cmdorctrl';

export interface KeyboardShortcut {
  id: string;
  /**
   * Canonical shortcut string in lowercase, modifiers in fixed order
   * (cmdorctrl|meta, ctrl, alt, shift) followed by the main key.
   * Examples: "cmdorctrl+shift+t", "alt+f4", "ctrl+k", "meta+enter".
   *
   * The main key portion is the lowercase letter/digit ("t", "5") for
   * normal keys, or the lowercase event.key name for special keys
   * ("f5", "arrowup", "enter"). Matching uses event.code for
   * letters/digits/F-keys so that macOS Option dead-keys still work.
   */
  keys: string;
  actionId: string; // 'translate' | 'grammar' | 'improve' | transformationId
  actionType: 'builtin' | 'transformation';
  enabled: boolean;
  label?: string;
}

export interface ParsedShortcut {
  /** The main key, lowercase. e.g., "t", "5", "f5", "arrowup". */
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  /** Smart cross-platform modifier (⌘ on Mac, Ctrl elsewhere). */
  cmdorctrl: boolean;
}

export interface ShortcutValidationResult {
  valid: boolean;
  error?: ShortcutValidationError;
}

export type ShortcutValidationError =
  | { type: 'invalid_format'; message: string }
  | { type: 'missing_modifier'; message: string }
  | { type: 'reserved_key'; message: string }
  | { type: 'duplicate'; existingShortcut: KeyboardShortcut }
  | { type: 'system_conflict'; conflictDescription: string };
