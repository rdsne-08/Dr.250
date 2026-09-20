import { forwardRef } from 'react';

import { cn } from '../../lib/classNames.js';
import { Loader } from './Loader.jsx';

const variants = {
  primary:
    'bg-health-600 text-white shadow-card hover:-translate-y-0.5 hover:bg-health-700 hover:shadow-lift active:translate-y-0',
  secondary:
    'border border-health-100 bg-white text-ink-800 shadow-card hover:-translate-y-0.5 hover:border-health-200 hover:bg-health-50',
  outline:
    'border border-health-300 bg-transparent text-health-800 hover:border-health-500 hover:bg-health-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-health-50 hover:text-health-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-base',
  icon: 'size-11 p-0',
};

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    children,
    className,
    disabled = false,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const buttonProps = Component === 'button' ? { disabled: isDisabled, type } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-200',
        'disabled:pointer-events-none disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      aria-busy={loading || undefined}
      aria-disabled={Component !== 'button' && isDisabled ? true : undefined}
      {...buttonProps}
      {...props}
    >
      {loading ? <Loader size="sm" label="Loading" /> : null}
      {children}
    </Component>
  );
});
