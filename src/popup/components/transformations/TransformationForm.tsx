import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useState } from 'react';

interface TransformationFormProps {
  initialName?: string;
  initialInstructions?: string;
  onSave: (name: string, instructions: string) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function TransformationForm({
  initialName = '',
  initialInstructions = '',
  onSave,
  onCancel,
  isEditing = false,
}: TransformationFormProps) {
  const [name, setName] = useState(initialName);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [errors, setErrors] = useState<{ name?: string; instructions?: string }>({});

  const validate = (): boolean => {
    const newErrors: { name?: string; instructions?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (!instructions.trim()) {
      newErrors.instructions = 'Instructions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(name.trim(), instructions.trim());
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
          maxLength={50}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
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
