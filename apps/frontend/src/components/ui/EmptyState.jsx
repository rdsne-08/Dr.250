import { ArrowRight, FileQuestion } from 'lucide-react';

import { cn } from '../../lib/classNames.js';
import { Button } from './Button.jsx';

export function EmptyState({
  actionHref,
  actionIcon: ActionIcon = ArrowRight,
  actionLabel,
  actionVariant = 'outline',
  className,
  description,
  icon: Icon = FileQuestion,
  onAction,
  title,
  ...props
}) {
  return (
    <div
      className={cn(
        'flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-ink-100 bg-white px-5 py-10 text-center',
        className,
      )}
      {...props}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-health-50 text-health-700">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold tracking-[-0.025em] text-ink-950">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p> : null}
      {actionLabel ? (
        <Button
          as={actionHref ? 'a' : 'button'}
          className="mt-5"
          href={actionHref}
          onClick={onAction}
          variant={actionVariant}
          size="sm"
        >
          {actionLabel}
          {ActionIcon ? <ActionIcon className="size-4" aria-hidden="true" /> : null}
        </Button>
      ) : null}
    </div>
  );
}
