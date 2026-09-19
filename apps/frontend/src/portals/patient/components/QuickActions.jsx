import { FileUp, FlaskConical, QrCode, Search } from 'lucide-react';

import { Button, Card } from '../../../components/ui/index.js';

const actionIcons = {
  uploadRecord: FileUp,
  findDoctor: Search,
  viewReports: FlaskConical,
  createQr: QrCode,
};

export function QuickActions({ actions, copy }) {
  return (
    <Card id="quick-actions" className="scroll-mt-24 p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
        {copy.actions.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
        {copy.actions.title}
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {actions.map((action) => {
          const Icon = actionIcons[action];

          return (
            <Button
              key={action}
              className="min-h-[4.75rem] justify-start rounded-2xl px-4 text-left"
              variant="secondary"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-health-50 text-health-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="leading-5">{copy.actions.items[action]}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
