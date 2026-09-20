import { cn } from '../../lib/classNames.js';

export function Card({ as: Component = 'div', children, className, interactive = false, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-3xl border border-ink-100/80 bg-white shadow-card',
        interactive &&
          'transition duration-300 hover:-translate-y-1 hover:border-health-200 hover:shadow-lift',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
