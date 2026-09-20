import { HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../../lib/classNames.js';

export function BrandMark({ className, compact = false }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2.5 rounded-xl text-ink-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-200',
        className,
      )}
      aria-label="Dr.250 home"
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-health-600 text-white shadow-card">
        <HeartPulse className="size-5" strokeWidth={2.4} aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="text-xl font-bold tracking-[-0.04em]">
          Dr.<span className="text-health-600">250</span>
        </span>
      ) : null}
    </Link>
  );
}
