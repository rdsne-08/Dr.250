import { cn } from '../../lib/classNames.js';

const sizes = {
  sm: 'size-4 border-2',
  md: 'size-7 border-[3px]',
  lg: 'size-10 border-4',
};

export function Loader({ className, label = 'Loading', size = 'md' }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span
        className={cn(
          'inline-block animate-spin rounded-full border-current border-r-transparent',
          sizes[size],
          className,
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
