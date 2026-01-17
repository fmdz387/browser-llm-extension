export type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta';

export interface KeyboardShortcut {
  id: string;
  keys: string; // "ctrl+shift+t" format
  actionId: string; // 'translate' | 'grammar' | 'improve' | transformationId
  actionType: 'builtin' | 'transformation';
  enabled: boolean;
  label?: string;
}

export interface ParsedShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
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
