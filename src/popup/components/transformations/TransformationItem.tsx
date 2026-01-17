import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Transformation } from '@/types/transformations';

import { useState } from 'react';

import { TransformationForm } from './TransformationForm';
import { TransformationTestPanel } from './TransformationTestPanel';

interface TransformationItemProps {
  transformation: Transformation;
  onUpdate: (id: string, updates: Partial<Transformation>) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
}

export function TransformationItem({
  transformation,
  onUpdate,
  onDelete,
  onToggleEnabled,
}: TransformationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = (name: string, instructions: string) => {
    onUpdate(transformation.id, { name, instructions });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${transformation.name}"?`)) {
      onDelete(transformation.id);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <TransformationForm
          initialName={transformation.name}
          initialInstructions={transformation.instructions}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isEditing
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
          </svg>
        </button>

        {/* Name and expand toggle */}
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex-1 truncate text-sm font-medium">{transformation.name}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {/* Enable toggle */}
        <Switch
          checked={transformation.enabled}
          onCheckedChange={() => onToggleEnabled(transformation.id)}
          aria-label={`${transformation.enabled ? 'Disable' : 'Enable'} ${transformation.name}`}
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-3 pb-3 pt-2">
          {/* Instructions preview */}
          <p className="mb-3 line-clamp-3 text-xs text-muted-foreground">
            {transformation.instructions}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsTesting(!isTesting)}>
              {isTesting ? 'Hide Test' : 'Test'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              Delete
            </Button>
          </div>

          {/* Test panel */}
          {isTesting && (
            <div className="mt-3">
              <TransformationTestPanel transformation={transformation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
