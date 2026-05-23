import { Button } from '@/components/ui/button';
import { useTransformationStore } from '@/store/useTransformationStore';

import { useCallback, useMemo, useState } from 'react';

import { TransformationForm } from './TransformationForm';
import { TransformationItem } from './TransformationItem';

export function TransformationList() {
  const {
    transformations,
    addTransformation,
    updateTransformation,
    deleteTransformation,
    toggleEnabled,
    reorderTransformations,
  } = useTransformationStore();

  const [isAdding, setIsAdding] = useState(false);

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Sort by order
  const sortedTransformations = useMemo(
    () => [...transformations].sort((a, b) => a.order - b.order),
    [transformations],
  );

  const handleAddNew = (data: {
    name: string;
    instructions: string;
    title?: string;
    description?: string;
  }) => {
    addTransformation(data);
    setIsAdding(false);
  };

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnter = useCallback(
    (id: string) => {
      if (!draggingId || id === draggingId) return;
      setDropTargetId(id);
    },
    [draggingId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) {
        setDraggingId(null);
        setDropTargetId(null);
        return;
      }

      const orderedIds = sortedTransformations.map((t) => t.id);
      const fromIndex = orderedIds.indexOf(draggingId);
      const toIndex = orderedIds.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) {
        setDraggingId(null);
        setDropTargetId(null);
        return;
      }

      const next = [...orderedIds];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingId);

      reorderTransformations(next);
      setDraggingId(null);
      setDropTargetId(null);
    },
    [draggingId, sortedTransformations, reorderTransformations],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transformations</h3>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            Add New
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-md border bg-muted/30 p-3">
          <TransformationForm onSave={handleAddNew} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      {sortedTransformations.length === 0 && !isAdding && (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No transformations yet. Click "Add New" to create one.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sortedTransformations.map((transformation) => (
          <TransformationItem
            key={transformation.id}
            transformation={transformation}
            onUpdate={updateTransformation}
            onDelete={deleteTransformation}
            onToggleEnabled={toggleEnabled}
            isDragging={draggingId === transformation.id}
            isDropTarget={dropTargetId === transformation.id}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag the handle to reorder. Enable/disable transformations to show them in the right-click menu.
      </p>
    </div>
  );
}
