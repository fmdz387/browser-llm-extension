import type { KeyboardShortcut } from '@/types/shortcuts';
import { DEFAULT_TRANSFORMATION_IDS } from '@/types/transformations';

/**
 * Platform detection.
 * Prefers the modern `navigator.userAgentData.platform` (Chrome 90+),
 * falls back to a User-Agent regex for older Chromium builds.
 * `navigator.platform` is deprecated and intentionally avoided.
 */
function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;

  const uaData = (
    navigator as Navigator & {
      userAgentData?: { platform?: string };
    }
  ).userAgentData;
  if (uaData?.platform) {
    return uaData.platform === 'macOS';
  }

  // Fallback: User-Agent string (works in MV3 service workers too)
  if (typeof navigator.userAgent === 'string') {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  return false;
}

export const isMac = detectMac();

/**
 * Apple HIG modifier order: Control, Option, Shift, Command.
 * https://developer.apple.com/design/human-interface-guidelines/keyboards
 */
export const MAC_MODIFIER_SYMBOLS = {
  ctrl: '⌃', // ⌃
  alt: '⌥', // ⌥
  shift: '⇧', // ⇧
  meta: '⌘', // ⌘
} as const;

/**
 * Windows/Linux modifier display labels.
 */
export const WINDOWS_MODIFIER_LABELS = {
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Win',
} as const;

/**
 * Platform-aware names used in validation messages.
 */
export const MODIFIER_NAMES = isMac
  ? { ctrl: 'Control', alt: 'Option', shift: 'Shift', meta: 'Command' }
  : { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' };

/**
 * Default keyboard shortcuts mapped to transformations.
 *
 * Platform-specific defaults:
 *   - macOS:         Control+Command+T/G/U   (⌃⌘T / ⌃⌘G / ⌃⌘U)
 *   - Windows/Linux: Ctrl+Shift+T/G/U
 *
 * Why Control+Command on Mac? It's the standard "extension/utility"
 * modifier pattern on macOS (used for system features like ⌃⌘F fullscreen,
 * ⌃⌘Space character picker) — it never collides with single-Cmd app
 * shortcuts (⌘C, ⌘V, ⌘S, etc.) and isn't a dead-key combo.
 *
 * Why Ctrl+Shift on Windows/Linux? It's the conventional secondary-action
 * modifier (used for incognito, devtools, reopen-tab) and never produces
 * composed characters.
 *
 * Matching is done via `event.code` for letters/digits/F-keys, so even if
 * a different keyboard layout maps a different glyph to a key the shortcut
 * still fires.
 */
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'id'>[] = isMac
  ? [
      {
        keys: 'ctrl+meta+t',
        actionId: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
        actionType: 'transformation',
        enabled: true,
        label: 'Translate to English',
      },
      {
        keys: 'ctrl+meta+g',
        actionId: DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
        actionType: 'transformation',
        enabled: true,
        label: 'Fix Grammar',
      },
      {
        keys: 'ctrl+meta+u',
        actionId: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_URBAN_ENGLISH,
        actionType: 'transformation',
        enabled: true,
        label: 'Translate to Urban English',
      },
    ]
  : [
      {
        keys: 'ctrl+shift+t',
        actionId: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
        actionType: 'transformation',
        enabled: true,
        label: 'Translate to English',
      },
      {
        keys: 'ctrl+shift+g',
        actionId: DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
        actionType: 'transformation',
        enabled: true,
        label: 'Fix Grammar',
      },
      {
        keys: 'ctrl+shift+u',
        actionId: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_URBAN_ENGLISH,
        actionType: 'transformation',
        enabled: true,
        label: 'Translate to Urban English',
      },
    ];

/**
 * Builtin action IDs for reference
 */
export const BUILTIN_ACTION_IDS = ['translate', 'grammar', 'improve'] as const;
export type BuiltinActionId = (typeof BUILTIN_ACTION_IDS)[number];

/**
 * Windows / Linux browser shortcuts that conflict with custom bindings.
 * Keys are normalized to: optional `ctrl+`, `shift+`, `alt+`, `meta+`, then the key.
 */
const WINDOWS_CONFLICT_SHORTCUTS: Record<string, string> = {
  'ctrl+t': 'New tab',
  'ctrl+w': 'Close tab',
  'ctrl+n': 'New window',
  'ctrl+shift+t': 'Reopen closed tab',
  'ctrl+shift+n': 'New incognito window',
  'ctrl+tab': 'Next tab',
  'ctrl+shift+tab': 'Previous tab',
  'ctrl+l': 'Focus address bar',
  'ctrl+d': 'Bookmark page',
  'ctrl+h': 'History',
  'ctrl+j': 'Downloads',
  'ctrl+f': 'Find on page',
  'ctrl+g': 'Find next',
  'ctrl+shift+g': 'Find previous',
  'ctrl+p': 'Print',
  'ctrl+s': 'Save page',
  'ctrl+r': 'Reload',
  'ctrl+shift+r': 'Hard reload',
  'ctrl+u': 'View source',
  'ctrl+shift+i': 'Developer tools',
  'ctrl+shift+j': 'Developer console',
  'ctrl+shift+c': 'Element inspector',
  'ctrl+shift+m': 'Toggle device toolbar',
  f1: 'Help',
  f3: 'Find next',
  f5: 'Reload',
  f6: 'Focus address bar',
  f7: 'Caret browsing',
  f11: 'Fullscreen',
  f12: 'Developer tools',
  'alt+f4': 'Close window',
  'alt+home': 'Home page',
};

/**
 * macOS browser + system shortcuts that conflict with custom bindings.
 * macOS uses ⌘ (meta) where Windows uses Ctrl, plus a set of Emacs-style
 * Ctrl bindings that work inside any standard text field (Cocoa text input).
 */
const MAC_CONFLICT_SHORTCUTS: Record<string, string> = {
  // Browser
  'meta+t': 'New tab',
  'meta+w': 'Close tab',
  'meta+n': 'New window',
  'meta+shift+t': 'Reopen closed tab',
  'meta+shift+n': 'New incognito window',
  'meta+l': 'Focus address bar',
  'meta+d': 'Bookmark page',
  'meta+shift+h': 'History',
  'meta+shift+j': 'Downloads',
  'meta+f': 'Find on page',
  'meta+g': 'Find next',
  'meta+shift+g': 'Find previous',
  'meta+p': 'Print',
  'meta+s': 'Save page',
  'meta+r': 'Reload',
  'meta+shift+r': 'Hard reload',
  'meta+u': 'View source',
  'meta+alt+i': 'Developer tools',
  'meta+alt+j': 'Developer console',
  'meta+alt+c': 'Element inspector',
  'meta+q': 'Quit Chrome',
  'meta+h': 'Hide Chrome',
  'meta+m': 'Minimize window',
  'meta+,': 'Preferences',
  'meta+shift+a': 'Search tabs',
  'meta+option+left': 'Previous tab',
  'meta+option+right': 'Next tab',
  f11: 'Show desktop',
  f12: 'Show Dashboard / DevTools',
  // Emacs-style text-field bindings (Cocoa)
  'ctrl+a': 'Move to start of line',
  'ctrl+e': 'Move to end of line',
  'ctrl+b': 'Move backward',
  'ctrl+f': 'Move forward',
  'ctrl+p': 'Move up',
  'ctrl+n': 'Move down',
  'ctrl+k': 'Delete to end of line',
  'ctrl+d': 'Delete forward',
  'ctrl+h': 'Delete backward',
  'ctrl+t': 'Transpose characters',
  'ctrl+y': 'Yank (paste)',
};

/**
 * Platform-correct conflict table. `isMac` is fixed at module load so this
 * is safe to compute once.
 */
export const SYSTEM_CONFLICT_SHORTCUTS: Record<string, string> = isMac
  ? MAC_CONFLICT_SHORTCUTS
  : WINDOWS_CONFLICT_SHORTCUTS;

/**
 * Reserved keys that cannot be used as shortcuts (even with modifiers)
 */
export const RESERVED_KEYS = [
  'tab',
  'enter',
  'space',
  'backspace',
  'delete',
  'escape',
  'capslock',
  'numlock',
  'scrolllock',
  'pause',
  'insert',
  'printscreen',
] as const;

/**
 * Special key display names for better readability
 */
export const SPECIAL_KEY_DISPLAY_NAMES: Record<string, string> = {
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  home: 'Home',
  end: 'End',
  ';': ';',
  ',': ',',
  '.': '.',
  '/': '/',
  '\\': '\\',
  '[': '[',
  ']': ']',
  '-': '-',
  '=': '=',
  '`': '`',
  "'": "'",
};
