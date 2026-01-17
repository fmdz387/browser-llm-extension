import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ShortcutRecorder } from '@/components/ShortcutRecorder';
import { SimpleSelect } from '@/components/SimpleSelect';
import { useShortcutStore } from '@/store/useShortcutStore';
import { useTransformationStore } from '@/store/useTransformationStore';

export function ShortcutSettings() {
  const {
    shortcuts,
    globalEnabled,
    requireTextSelection,
    disableInEditableFields,
    setShortcut,
    addCustomShortcut,
    removeShortcut,
    toggleShortcut,
    resetToDefaults,
    setGlobalEnabled,
    setRequireTextSelection,
    setDisableInEditableFields,
  } = useShortcutStore();

  const transformations = useTransformationStore((state) => state.transformations);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTransformationId, setNewTransformationId] = useState('');
  const [newShortcutKeys, setNewShortcutKeys] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Get transformations that don't have shortcuts yet
  const availableTransformations = transformations.filter(
    (t) => !shortcuts.some((s) => s.actionId === t.id)
  );

  const handleAddNewShortcut = useCallback(() => {
    if (!newTransformationId || !newShortcutKeys) {
      setAddError('Please select a transformation and record a shortcut.');
      return;
    }

    const transformation = transformations.find((t) => t.id === newTransformationId);
    const result = addCustomShortcut(newTransformationId, newShortcutKeys, transformation?.name);

    if (!result.valid && result.error?.type !== 'system_conflict') {
      if (result.error?.type === 'duplicate') {
        setAddError(`Already used by "${result.error.existingShortcut.label || result.error.existingShortcut.actionId}"`);
      } else if (result.error && 'message' in result.error) {
        setAddError(result.error.message);
      }
      return;
    }

    // Success - reset form
    setIsAddingNew(false);
    setNewTransformationId('');
    setNewShortcutKeys('');
    setAddError(null);
  }, [newTransformationId, newShortcutKeys, transformations, addCustomShortcut]);

  const handleCancelAdd = useCallback(() => {
    setIsAddingNew(false);
    setNewTransformationId('');
    setNewShortcutKeys('');
    setAddError(null);
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>

      {/* Global Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="shortcuts-enabled">Enable Shortcuts</Label>
            <p className="text-xs text-muted-foreground">
              Turn all keyboard shortcuts on or off
            </p>
          </div>
          <Switch
            id="shortcuts-enabled"
            checked={globalEnabled}
            onCheckedChange={setGlobalEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="require-selection">Require Text Selection</Label>
            <p className="text-xs text-muted-foreground">
              Only trigger when text is selected
            </p>
          </div>
          <Switch
            id="require-selection"
            checked={requireTextSelection}
            onCheckedChange={setRequireTextSelection}
            disabled={!globalEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="disable-in-fields">Disable in Text Fields</Label>
            <p className="text-xs text-muted-foreground">
              Don't trigger in inputs or text areas
            </p>
          </div>
          <Switch
            id="disable-in-fields"
            checked={disableInEditableFields}
            onCheckedChange={setDisableInEditableFields}
            disabled={!globalEnabled}
          />
        </div>
      </div>

      {/* Shortcuts List */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Configured Shortcuts
        </h4>

        {shortcuts.length === 0 && !isAddingNew && (
          <p className="text-xs text-muted-foreground">
            No shortcuts configured. Add one below.
          </p>
        )}

        {shortcuts.map((shortcut) => {
          const transformation = transformations.find((t) => t.id === shortcut.actionId);
          const label = shortcut.label || transformation?.name || shortcut.actionId;

          return (
            <div key={shortcut.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Switch
                  checked={shortcut.enabled}
                  onCheckedChange={() => toggleShortcut(shortcut.id)}
                  disabled={!globalEnabled}
                />
                <span className="text-sm truncate" title={label}>
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ShortcutRecorder
                  value={shortcut.keys}
                  onChange={(keys) => setShortcut(shortcut.id, keys)}
                  excludeShortcutId={shortcut.id}
                  disabled={!globalEnabled || !shortcut.enabled}
                />
              </div>
            </div>
          );
        })}

        {/* Add New Shortcut */}
        {isAddingNew ? (
          <div className="space-y-3 rounded-md border border-border p-3">
            <SimpleSelect
              label="Transformation"
              placeholder="Select transformation..."
              options={availableTransformations.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              value={newTransformationId}
              onChange={setNewTransformationId}
            />
            <div className="space-y-2">
              <Label>Shortcut</Label>
              <ShortcutRecorder
                value={newShortcutKeys}
                onChange={setNewShortcutKeys}
                placeholder="Click to record"
              />
            </div>
            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNewShortcut}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelAdd}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            disabled={!globalEnabled || availableTransformations.length === 0}
            className="w-full"
          >
            {availableTransformations.length === 0
              ? 'All transformations have shortcuts'
              : 'Add Transformation Shortcut'}
          </Button>
        )}
      </div>

      {/* Reset to Defaults */}
      <div className="pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={resetToDefaults}
          className="w-full"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
