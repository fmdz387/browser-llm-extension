import { Button } from '@/components/ui/button';
import { useTransformationStore } from '@/store/useTransformationStore';

import { useState } from 'react';

import { TransformationForm } from './TransformationForm';
import { TransformationItem } from './TransformationItem';

export function TransformationList() {
  const {
    transformations,
    addTransformation,
    updateTransformation,
    deleteTransformation,
    toggleEnabled,
  } = useTransformationStore();

  const [isAdding, setIsAdding] = useState(false);

  // Sort by order
  const sortedTransformations = [...transformations].sort((a, b) => a.order - b.order);

  const handleAddNew = (data: {
    name: string;
    instructions: string;
    title?: string;
    description?: string;
  }) => {
    addTransformation(data);
    setIsAdding(false);
  };

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
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Enable/disable transformations to show them in the right-click menu.
      </p>
    </div>
  );
}
