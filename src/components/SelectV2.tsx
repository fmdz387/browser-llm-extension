import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

import { Ref, forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Spinner } from './ui/spinner';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  name?: string;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const SelectV2 = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      placeholder,
      options,
      value: propValue,
      onChange,
      error,
      description,
      disabled,
      loading,
      className = '',
    },
    ref,
  ) => {
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Use propValue directly as the controlled value
    const value = propValue;

    const handleChange = (newValue: string) => {
      onChange && onChange(newValue);
      setSearchQuery(''); // Reset search when value is selected
    };

    // Focus search input when select opens
    useEffect(() => {
      if (isOpen && searchInputRef.current && options.length > 10) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }, [isOpen, options.length]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return options;

      const query = searchQuery.toLowerCase();
      return options.filter((option) => {
        const labelStr = String(option.label ?? '').toLowerCase();
        const descStr = String(option.description ?? '').toLowerCase();
        const valueStr = String(option.value ?? '').toLowerCase();

        return labelStr.includes(query) || descStr.includes(query) || valueStr.includes(query);
      });
    }, [options, searchQuery]);

    const selectComponent = (
      <RadixSelect
        value={value}
        onValueChange={handleChange}
        disabled={disabled || loading}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger
          ref={ref as Ref<HTMLButtonElement>}
          className={cn(
            'w-full',
            {
              'opacity-50': disabled || loading,
            },
            className,
          )}
          hasSelectedValue={!!value}
        >
          <div className="flex items-center gap-2">
            {loading && <Spinner className="h-4 w-4" />}
            <SelectValue placeholder={placeholder}>
              {options.find((option) => option.value === value)?.label ||
                (value && disabled ? value : undefined)}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {/* Search Input - Only show if there are many options */}
          {options.length > 10 && (
            <div className="sticky top-0 z-10 border-b border-border bg-background p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-2"
                  onKeyDown={(e) => {
                    e.stopPropagation(); // Prevent select from closing on key press
                  }}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                  {option.description && (
                    <span className="text-muted-foreground">
                      {' - '}
                      {option.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </div>
          )}
        </SelectContent>
      </RadixSelect>
    );

    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        {selectComponent}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

SelectV2.displayName = 'SelectV2';
