import * as React from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const multiSelectVariants = cva(
  'm-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300',
  {
    variants: {
      variant: {
        default: 'border-foreground/10 text-foreground bg-card hover:bg-card/80',
        secondary:
          'border-foreground/10 bg-secondary text-white dark:text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        inverted: 'inverted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface MultiSelectProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiSelectVariants> {
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
    imageUrl?: string;
    subLabel?: string;
    disabled?: boolean;
  }[];
  onValueChange: (value: string[]) => void;
  value: string[];
  placeholder?: string;
  maxCount?: number;
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      variant,
      value = [],
      placeholder = 'Select options',
      maxCount = 5,
      ...props
    },
    ref
  ) => {
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom');
    const [maxHeight, setMaxHeight] = React.useState(240); // 15rem = 240px
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const calculateDropdownPosition = React.useCallback(() => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      

      const dropdownMaxHeight = 240; // Maximum height we want
      let top: number;
      let height: number;

      // Simple logic: try to position below first, then above
      if (spaceBelow >= 200) {
        // Enough space below - position below
        top = rect.bottom + 8;
        height = Math.min(dropdownMaxHeight, spaceBelow - 20);
      } else if (spaceAbove >= 200) {
        // Not enough space below, but enough above - position above
        height = Math.min(dropdownMaxHeight, spaceAbove - 20);
        top = rect.top - height - 8;
      } else {
        // Not enough space in either direction - use available space
        if (spaceBelow > spaceAbove) {
          top = rect.bottom + 8;
          height = Math.max(100, spaceBelow - 20);
        } else {
          height = Math.max(100, spaceAbove - 20);
          top = rect.top - height - 8;
        }
      }

      // Ensure dropdown stays within viewport bounds
      const minTop = 10;
      const maxTop = viewportHeight - height - 10;
      top = Math.max(minTop, Math.min(top, maxTop));

      setDropdownPosition('bottom'); // Always set to bottom for simplicity
      setMaxHeight(height);
      
        const style = {
          position: 'fixed' as const,
          top: `${top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 100000, // Higher than dialog z-index (99999)
          pointerEvents: 'auto' as const, // Ensure dropdown can receive mouse events
        };
        setDropdownStyle(style);
    }, []);

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === 'Enter') {
        setIsPopoverOpen(true);
      } else if (
        event.key === 'Backspace' &&
        !(event.target as HTMLInputElement).value
      ) {
        const newSelectedValues = [...value];
        newSelectedValues.pop();
        onValueChange(newSelectedValues);
      }
    };

    const handleSelectOption = (selectedValue: string) => {
      const option = options.find((o) => o.value === selectedValue);
      if (option?.disabled) return;

      setInputValue('');
      if (value.includes(selectedValue)) {
        onValueChange(value.filter((v) => v !== selectedValue));
      } else {
        onValueChange([...value, selectedValue]);
      }
      inputRef.current?.focus();
    };

    const handleFocus = () => {
      calculateDropdownPosition();
      setIsPopoverOpen(true);
      setIsFocused(true);
    };

    const handleBlur = () => {
      // We need a delay to allow the select action to be processed
      setTimeout(() => {
        // Check if the active element is within our dropdown
        const activeElement = document.activeElement;
        
        if (!inputRef.current?.contains(activeElement) && 
            !dropdownRef.current?.contains(activeElement)) {
          setIsPopoverOpen(false);
        }
      }, 200); // Increased delay
      setIsFocused(false);
    };

    // Add scroll listener to recalculate position and click outside handler
    React.useEffect(() => {
      const handleScroll = () => {
        if (isPopoverOpen) {
          calculateDropdownPosition();
        }
      };

      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsPopoverOpen(false);
        }
      };

      if (isPopoverOpen) {
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          window.removeEventListener('scroll', handleScroll, true);
          window.removeEventListener('resize', handleScroll);
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [isPopoverOpen, calculateDropdownPosition]);

    const filteredOptions = options.filter(
      (option) =>
        !option.disabled &&
        !value.includes(option.value) &&
        (option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.subLabel?.toLowerCase().includes(inputValue.toLowerCase()))
    );


    // Combine refs
    const combinedRef = React.useCallback((node: HTMLDivElement) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    return (
      <div ref={combinedRef} className="relative w-full" {...props}>
        <div
          className={cn(
            'flex flex-wrap gap-1 rounded-md border border-input p-1',
            { 'ring-2 ring-ring': isFocused }
          )}
          onClick={() => {
            inputRef.current?.focus();
          }}
        >
          {value.map((selectedValue) => {
            const option = options.find((o) => o.value === selectedValue);
            if (!option) return null;

            return (
              <Badge
                key={selectedValue}
                className={cn(multiSelectVariants({ variant }), 'flex items-center gap-1.5')}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={option.imageUrl} alt={option.label} />
                  <AvatarFallback>{option.label.charAt(0)}</AvatarFallback>
                </Avatar>
                {option.label}
                <button
                  className="ml-1 ring-offset-background rounded-full focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectOption(selectedValue);
                  }}
                  aria-label={`Remove ${option.label}`}
                  style={{ visibility: option.disabled ? 'hidden' : 'visible' }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="ml-2 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        {(() => {
          return isPopoverOpen && filteredOptions.length > 0;
        })() && (() => {
          return createPortal(
      <div 
        ref={dropdownRef}
        className="rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl border-gray-200 dark:border-gray-700"
        style={{
          ...dropdownStyle,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          pointerEvents: 'auto',
          position: 'fixed',
          zIndex: 999999 // Even higher z-index
        }}
        data-testid="multiselect-dropdown"
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent input blur
          e.stopPropagation(); // Stop event bubbling
        }}
      >
              <ul 
                className="overflow-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
                style={{ maxHeight: `${maxHeight}px` }}
              >
                {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectOption(option.value);
                  }}
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground group"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={option.imageUrl} alt={option.label} />
                      <AvatarFallback>{option.label.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div>{option.label}</div>
                      {option.subLabel && <div className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">{option.subLabel}</div>}
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            </div>,
            document.body
          );
        })()}
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export { MultiSelect }; 