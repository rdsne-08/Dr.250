import { cn } from '../../lib/classNames.js';

const variants = {
  health: 'border-health-200 bg-health-50 text-health-800',
  teal: 'border-medical-200 bg-medical-50 text-medical-800',
  neutral: 'border-ink-100 bg-ink-50 text-ink-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function Badge({ children, className, variant = 'health', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
