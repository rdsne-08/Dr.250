import { Search, X } from 'lucide-react';
import { forwardRef, useId, useState } from 'react';

import { cn } from '../../lib/classNames.js';

export const SearchBar = forwardRef(function SearchBar(
  {
    className,
    clearLabel = 'Clear search',
    defaultValue = '',
    disabled = false,
    id: providedId,
    label = 'Search',
    onChange,
    onClear,
    onValueChange,
    placeholder,
    showLabel = false,
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const hasValue = String(currentValue ?? '').length > 0;

  function handleChange(event) {
    const nextValue = event.target.value;

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(event);
    onValueChange?.(nextValue, event);
  }

  function handleClear(event) {
    if (!isControlled) {
      setInternalValue('');
    }

    onValueChange?.('', event);
    onClear?.(event);
  }

  return (
    <div className={cn('w-full', className)}>
      <label
        className={showLabel ? 'mb-2 block text-sm font-semibold text-ink-800' : 'sr-only'}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-300"
          aria-hidden="true"
        />
        <input
          ref={ref}
          id={id}
          type="search"
          value={currentValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          className={cn(
            'min-h-12 w-full rounded-2xl border border-ink-100 bg-white py-2 pl-11 text-base text-ink-900 outline-none transition',
            'placeholder:text-ink-300 focus:border-health-500 focus:ring-4 focus:ring-health-100',
            'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
            '[&::-webkit-search-cancel-button]:appearance-none',
            hasValue ? 'pr-12' : 'pr-4',
          )}
          {...props}
        />
        {hasValue && !disabled ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-400 transition hover:bg-health-50 hover:text-health-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100"
            onClick={handleClear}
            aria-label={clearLabel}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
});
