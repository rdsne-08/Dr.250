import { forwardRef, useId } from 'react';

import { cn } from '../../lib/classNames.js';

export const Input = forwardRef(function Input(
  { className, error, hint, id: providedId, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-ink-800" htmlFor={id}>
          {label}
          {required ? <span className="ml-1 text-health-700">*</span> : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={cn(
          'min-h-12 w-full rounded-2xl border bg-white px-4 text-base text-ink-900 outline-none transition',
          'placeholder:text-ink-300 focus:border-health-500 focus:ring-4 focus:ring-health-100',
          'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
          error ? 'border-red-400' : 'border-ink-100',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={descriptionId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="mt-2 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
