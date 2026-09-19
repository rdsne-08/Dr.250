import { ShieldCheck } from 'lucide-react';

import { cn } from '../../lib/classNames.js';
import { Card } from './Card.jsx';

const variants = {
  health: {
    card: 'border-health-100 bg-gradient-to-br from-white to-health-50/60',
    icon: 'bg-health-100 text-health-700',
    indicator: 'bg-health-500 shadow-[0_0_0_4px_rgba(32,169,127,0.12)]',
    status: 'text-health-700',
  },
  teal: {
    card: 'border-medical-100 bg-gradient-to-br from-white to-medical-50/60',
    icon: 'bg-medical-100 text-medical-700',
    indicator: 'bg-medical-500 shadow-[0_0_0_4px_rgba(41,170,164,0.12)]',
    status: 'text-medical-700',
  },
  warning: {
    card: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/60',
    icon: 'bg-amber-100 text-amber-700',
    indicator: 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]',
    status: 'text-amber-700',
  },
  error: {
    card: 'border-red-100 bg-gradient-to-br from-white to-red-50/60',
    icon: 'bg-red-100 text-red-700',
    indicator: 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]',
    status: 'text-red-700',
  },
  neutral: {
    card: 'border-ink-100 bg-white',
    icon: 'bg-ink-50 text-ink-600',
    indicator: 'bg-ink-300 shadow-[0_0_0_4px_rgba(155,176,168,0.12)]',
    status: 'text-ink-600',
  },
};

export function StatusCard({
  className,
  description,
  icon: Icon = ShieldCheck,
  status,
  title,
  variant = 'health',
  ...props
}) {
  const styles = variants[variant] ?? variants.health;

  return (
    <Card
      className={cn('p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift', styles.card, className)}
      aria-label={`${title}: ${status}`}
      {...props}
    >
      <div className="flex items-start gap-4">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', styles.icon)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-ink-900">{title}</h3>
            <span className={cn('inline-flex items-center gap-2 text-xs font-bold', styles.status)}>
              <span className={cn('size-2 rounded-full', styles.indicator)} aria-hidden="true" />
              {status}
            </span>
          </div>
          {description ? <p className="mt-2 text-sm leading-6 text-ink-500">{description}</p> : null}
        </div>
      </div>
    </Card>
  );
}
