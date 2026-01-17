import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRANSFORMATION_LIMITS } from '@/types/transformations';

import { useState } from 'react';

interface TransformationFormData {
  name: string;
  instructions: string;
  title?: string;
  description?: string;
}

interface TransformationFormProps {
  initialName?: string;
  initialInstructions?: string;
  initialTitle?: string;
  initialDescription?: string;
  onSave: (data: TransformationFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function TransformationForm({
  initialName = '',
  initialInstructions = '',
  initialTitle = '',
  initialDescription = '',
  onSave,
  onCancel,
  isEditing = false,
}: TransformationFormProps) {
  const [name, setName] = useState(initialName);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [errors, setErrors] = useState<{
    name?: string;
    instructions?: string;
    title?: string;
    description?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length > TRANSFORMATION_LIMITS.NAME_MAX_LENGTH) {
      newErrors.name = `Name must be ${TRANSFORMATION_LIMITS.NAME_MAX_LENGTH} characters or less`;
    }

    if (!instructions.trim()) {
      newErrors.instructions = 'Instructions are required';
    }

    if (title && title.length > TRANSFORMATION_LIMITS.TITLE_MAX_LENGTH) {
      newErrors.title = `Title must be ${TRANSFORMATION_LIMITS.TITLE_MAX_LENGTH} characters or less`;
    }

    if (description && description.length > TRANSFORMATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
      newErrors.description = `Description must be ${TRANSFORMATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        name: name.trim(),
        instructions: instructions.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="transformation-name">Name</Label>
        <Input
          id="transformation-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Translate to Spanish"
          maxLength={TRANSFORMATION_LIMITS.NAME_MAX_LENGTH}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="transformation-title">
            Popover Title <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="transformation-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Translation"
            maxLength={TRANSFORMATION_LIMITS.TITLE_MAX_LENGTH}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="transformation-description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="transformation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Converting to Spanish"
            maxLength={TRANSFORMATION_LIMITS.DESCRIPTION_MAX_LENGTH}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transformation-instructions">Instructions</Label>
        <textarea
          id="transformation-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g., Translate the text to Spanish. Preserve the original tone and formatting."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
        {errors.instructions && <p className="text-xs text-destructive">{errors.instructions}</p>}
        <p className="text-xs text-muted-foreground">
          Describe how the AI should transform the text
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
