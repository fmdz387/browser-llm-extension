import type { KeyboardShortcut } from '@/types/shortcuts';
import { DEFAULT_TRANSFORMATION_IDS } from '@/types/transformations';

/**
 * Platform detection - checks if running on Mac
 */
export const isMac =
  typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

/**
 * Modifier key display symbols for Mac
 */
export const MAC_MODIFIER_SYMBOLS = {
  ctrl: '\u2303', // ⌃
  meta: '\u2318', // ⌘
  alt: '\u2325', // ⌥
  shift: '\u21E7', // ⇧
} as const;

/**
 * Modifier key display labels for Windows/Linux
 */
export const WINDOWS_MODIFIER_LABELS = {
  ctrl: 'Ctrl',
  meta: 'Win',
  alt: 'Alt',
  shift: 'Shift',
} as const;

/**
 * Default keyboard shortcuts mapped to transformations
 * Alt+Shift+F1/F2/F3 - doesn't conflict with typing or browser shortcuts
 */
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'id'>[] = [
  {
    keys: 'alt+shift+f1',
    actionId: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
    actionType: 'transformation',
    enabled: true,
    label: 'Translate to English',
  },
  {
    keys: 'alt+shift+f2',
    actionId: DEFAULT_TRANSFORMATION_IDS.MAKE_CONCISE,
    actionType: 'transformation',
    enabled: true,
    label: 'Make Concise',
  },
  {
    keys: 'alt+shift+f3',
    actionId: DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
    actionType: 'transformation',
    enabled: true,
    label: 'Fix Grammar',
  },
];

/**
 * Builtin action IDs for reference
 */
export const BUILTIN_ACTION_IDS = ['translate', 'grammar', 'improve'] as const;
export type BuiltinActionId = (typeof BUILTIN_ACTION_IDS)[number];

/**
 * Known system/browser shortcuts that will show a conflict warning
 * These are common shortcuts across browsers that could cause issues
 */
export const SYSTEM_CONFLICT_SHORTCUTS: Record<string, string> = {
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
  'f1': 'Help',
  'f3': 'Find next',
  'f5': 'Reload',
  'f6': 'Focus address bar',
  'f7': 'Caret browsing',
  'f11': 'Fullscreen',
  'f12': 'Developer tools',
  'alt+f4': 'Close window',
  'alt+home': 'Home page',
};

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
