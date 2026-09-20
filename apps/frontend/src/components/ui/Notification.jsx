import { AlertTriangle, CheckCircle2, CircleX, X } from 'lucide-react';

import { cn } from '../../lib/classNames.js';

const variants = {
  success: {
    container: 'border-health-200 bg-health-50 text-health-900',
    icon: 'bg-white text-health-700',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'bg-white text-amber-700',
    Icon: AlertTriangle,
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-950',
    icon: 'bg-white text-red-700',
    Icon: CircleX,
  },
};

export function Notification({
  className,
  dismissLabel = 'Dismiss notification',
  message,
  onDismiss,
  title,
  variant = 'success',
  ...props
}) {
  const styles = variants[variant] ?? variants.success;
  const Icon = styles.Icon;
  const isUrgent = variant === 'error' || variant === 'warning';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 shadow-card transition duration-300',
        styles.container,
        className,
      )}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      {...props}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl shadow-card', styles.icon)}>
        <Icon className="size-[1.125rem]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-bold">{title}</p>
        {message ? <p className="mt-1 text-sm leading-6 opacity-75">{message}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-xl opacity-60 transition hover:bg-white/70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
