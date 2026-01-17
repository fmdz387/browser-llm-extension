import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Input } from './ui/input';
import { Label } from './ui/label';
import { Spinner } from './ui/spinner';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SimpleSelectProps {
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
  searchThreshold?: number;
}

export function SimpleSelect({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  error,
  description,
  disabled,
  loading,
  className,
  searchThreshold = 10,
}: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const showSearch = options.length > searchThreshold;

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

  // Reset state when closing
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  }, []);

  // Open and focus search
  const open = useCallback(() => {
    setIsOpen(true);
    setHighlightedIndex(0);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen, showSearch]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          close();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
            handleSelect(filteredOptions[highlightedIndex].value);
          }
          break;
        case 'Tab':
          close();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, filteredOptions, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    close();
  };

  const handleTriggerClick = () => {
    if (disabled || loading) return;
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const isDisabled = disabled || loading;

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <Label>{label}</Label>}

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={isDisabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selectedOption && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {loading && <Spinner className="h-4 w-4" />}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute left-0 right-0 top-full z-50 mt-1',
              'overflow-hidden rounded-md border bg-popover shadow-md',
            )}
          >
            {/* Search input */}
            {showSearch && (
              <div className="border-b border-border p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    className="h-8 pl-8 pr-2"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div ref={listRef} className="max-h-[200px] overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {options.length === 0 ? 'No options' : 'No results found'}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
                      'transition-colors',
                      index === highlightedIndex && 'bg-accent text-accent-foreground',
                      option.disabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    <span className="flex-1 truncate text-left">
                      {option.label}
                      {option.description && (
                        <span className="ml-1 text-muted-foreground">- {option.description}</span>
                      )}
                    </span>
                    {option.value === value && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
