import * as React from 'react';
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
          'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
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
    const inputRef = React.useRef<HTMLInputElement>(null);

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
      setInputValue('');
      if (value.includes(selectedValue)) {
        onValueChange(value.filter((v) => v !== selectedValue));
      } else {
        onValueChange([...value, selectedValue]);
      }
      inputRef.current?.focus();
    };

    const handleFocus = () => {
      setIsPopoverOpen(true);
      setIsFocused(true);
    };

    const handleBlur = () => {
      // We need a small delay to allow the select action to be processed
      setTimeout(() => {
        if (!inputRef.current?.contains(document.activeElement)) {
          setIsPopoverOpen(false);
        }
      }, 100);
      setIsFocused(false);
    };

    const filteredOptions = options.filter(
      (option) =>
        !value.includes(option.value) &&
        (option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.subLabel?.toLowerCase().includes(inputValue.toLowerCase()))
    );

    return (
      <div ref={ref} className="relative w-full" {...props}>
        <div
          className={cn(
            'flex flex-wrap gap-1 rounded-md border border-input p-1',
            { 'ring-2 ring-ring': isFocused }
          )}
          onClick={() => inputRef.current?.focus()}
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
        {isPopoverOpen && filteredOptions.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <ul className="max-h-60 overflow-auto p-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(option.value);
                  }}
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={option.imageUrl} alt={option.label} />
                      <AvatarFallback>{option.label.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div>{option.label}</div>
                      {option.subLabel && <div className="text-xs text-muted-foreground">{option.subLabel}</div>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export { MultiSelect }; 