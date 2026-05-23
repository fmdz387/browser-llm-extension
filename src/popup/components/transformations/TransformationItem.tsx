import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Transformation } from '@/types/transformations';

import { useRef, useState } from 'react';

import { TransformationForm } from './TransformationForm';
import { TransformationTestPanel } from './TransformationTestPanel';

interface TransformationItemProps {
  transformation: Transformation;
  onUpdate: (id: string, updates: Partial<Transformation>) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onDragEnd?: () => void;
  onDrop?: (id: string) => void;
}

export function TransformationItem({
  transformation,
  onUpdate,
  onDelete,
  onToggleEnabled,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: TransformationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Only enable native draggable when the user grabs the handle.
  // Otherwise click-to-expand and button clicks would start drags.
  const [draggable, setDraggable] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleSave = (data: {
    name: string;
    instructions: string;
    title?: string;
    description?: string;
  }) => {
    onUpdate(transformation.id, data);
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
          initialTitle={transformation.title}
          initialDescription={transformation.description}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isEditing
        />
      </div>
    );
  }

  const handleNativeDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    // Some browsers require non-empty dataTransfer for drag to start
    e.dataTransfer.setData('text/plain', transformation.id);
    onDragStart?.(transformation.id);
  };

  const handleNativeDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Allow drop
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleNativeDragEnter = () => {
    onDragEnter?.(transformation.id);
  };

  const handleNativeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop?.(transformation.id);
    setDraggable(false);
  };

  const handleNativeDragEnd = () => {
    onDragEnd?.();
    setDraggable(false);
  };

  return (
    <div
      ref={rowRef}
      draggable={draggable}
      onDragStart={handleNativeDragStart}
      onDragOver={handleNativeDragOver}
      onDragEnter={handleNativeDragEnter}
      onDrop={handleNativeDrop}
      onDragEnd={handleNativeDragEnd}
      className={cn(
        'rounded-md border bg-background transition-shadow',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-2 ring-primary',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle — pressing the mouse here arms native drag */}
        <button
          type="button"
          className={cn(
            'shrink-0 text-muted-foreground hover:text-foreground',
            draggable ? 'cursor-grabbing' : 'cursor-grab',
          )}
          aria-label="Drag to reorder"
          onMouseDown={() => setDraggable(true)}
          onMouseUp={() => setDraggable(false)}
          onMouseLeave={() => {
            // If user releases off the handle, also disarm — drag may still
            // initiate if mousedown was already followed by movement.
            if (!isDragging) setDraggable(false);
          }}
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
