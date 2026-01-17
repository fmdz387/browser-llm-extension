import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  eventToShortcutString,
  formatShortcutForDisplay,
  validateShortcut,
  isModifierOnlyEvent,
  getModifiersFromEvent,
} from '@/services/ShortcutService';
import { useShortcutStore } from '@/store/useShortcutStore';
import type { ShortcutValidationResult } from '@/types/shortcuts';
import { isMac, MAC_MODIFIER_SYMBOLS, WINDOWS_MODIFIER_LABELS } from '@/constants/shortcuts';

interface ShortcutRecorderProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (result: ShortcutValidationResult) => void;
  excludeShortcutId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ShortcutRecorder({
  value,
  onChange,
  onValidationChange,
  excludeShortcutId,
  placeholder = 'Click to record',
  disabled = false,
}: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentModifiers, setCurrentModifiers] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  const shortcuts = useShortcutStore((state) => state.shortcuts);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isRecording) return;

      event.preventDefault();
      event.stopPropagation();

      // Handle Escape to cancel
      if (event.key === 'Escape') {
        setIsRecording(false);
        setCurrentModifiers([]);
        setValidationError(null);
        setValidationWarning(null);
        return;
      }

      // Update current modifiers display
      const modifiers = getModifiersFromEvent(event);
      setCurrentModifiers(modifiers);

      // If only modifiers pressed, wait for main key
      if (isModifierOnlyEvent(event)) {
        return;
      }

      // Got a complete shortcut
      const shortcutString = eventToShortcutString(event);
      if (!shortcutString) return;

      // Validate
      const validation = validateShortcut(shortcutString, shortcuts, excludeShortcutId);

      if (!validation.valid) {
        // Show error but don't accept the shortcut
        if (validation.error?.type === 'invalid_format') {
          setValidationError(validation.error.message);
        } else if (validation.error?.type === 'missing_modifier') {
          setValidationError(validation.error.message);
        } else if (validation.error?.type === 'reserved_key') {
          setValidationError(validation.error.message);
        } else if (validation.error?.type === 'duplicate') {
          const label = validation.error.existingShortcut.label || validation.error.existingShortcut.actionId;
          setValidationError(`Already used by "${label}"`);
        }
        onValidationChange?.(validation);
        return;
      }

      // Check for system conflict warning
      if (validation.error?.type === 'system_conflict') {
        setValidationWarning(`May conflict with: ${validation.error.conflictDescription}`);
      } else {
        setValidationWarning(null);
      }

      // Accept the shortcut
      setValidationError(null);
      setIsRecording(false);
      setCurrentModifiers([]);
      onChange(shortcutString);
      onValidationChange?.(validation);
    },
    [isRecording, shortcuts, excludeShortcutId, onChange, onValidationChange]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!isRecording) return;

      // Update modifiers when released
      const modifiers = getModifiersFromEvent(event);
      setCurrentModifiers(modifiers);
    },
    [isRecording]
  );

  const handleBlur = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      setCurrentModifiers([]);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyUp, true);

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyUp, true);
      };
    }
  }, [isRecording, handleKeyDown, handleKeyUp]);

  const handleClick = () => {
    if (disabled) return;
    setIsRecording(true);
    setValidationError(null);
    setCurrentModifiers([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setValidationError(null);
    setValidationWarning(null);
    onValidationChange?.({ valid: true });
  };

  const formatModifiersForDisplay = (modifiers: string[]): string => {
    if (modifiers.length === 0) return '';

    const symbols = isMac ? MAC_MODIFIER_SYMBOLS : WINDOWS_MODIFIER_LABELS;
    const separator = isMac ? '' : '+';

    return modifiers
      .map((m) => symbols[m as keyof typeof symbols] || m)
      .join(separator) + (isMac ? '' : '+');
  };

  const displayValue = isRecording
    ? currentModifiers.length > 0
      ? formatModifiersForDisplay(currentModifiers) + '...'
      : 'Press keys...'
    : value
      ? formatShortcutForDisplay(value)
      : placeholder;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button
          ref={inputRef}
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'min-w-[120px] justify-start font-mono text-xs',
            isRecording && 'ring-2 ring-primary',
            !value && !isRecording && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={handleClick}
          onBlur={handleBlur}
          disabled={disabled}
        >
          {displayValue}
        </Button>
        {value && !isRecording && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClear}
            aria-label="Clear shortcut"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>
      {validationError && (
        <p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
      )}
      {validationWarning && !validationError && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">{validationWarning}</p>
      )}
    </div>
  );
}
