import { ArrowUpRight, FileHeart, FlaskConical, Pill, Stethoscope } from 'lucide-react';

import { Badge, Card } from '../../../components/ui/index.js';

const overviewIcons = {
  records: FileHeart,
  visits: Stethoscope,
  reports: FlaskConical,
  prescriptions: Pill,
};

const iconStyles = {
  records: 'bg-health-50 text-health-700',
  visits: 'bg-medical-50 text-medical-700',
  reports: 'bg-health-100 text-health-800',
  prescriptions: 'bg-medical-100 text-medical-800',
};

export function HealthOverview({ copy, items }) {
  return (
    <section id="health-overview" className="scroll-mt-24">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
            {copy.overview.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
            {copy.overview.title}
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-ink-500">{copy.overview.description}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const itemCopy = copy.overview.items[item.id];
          const Icon = overviewIcons[item.id];

          return (
            <Card
              key={item.id}
              interactive
              className="animate-fade-up p-5"
              style={{ animationDelay: `${80 + index * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-2xl ${iconStyles[item.id]}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight className="size-4 text-ink-300" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-sm font-bold text-ink-700">{itemCopy.title}</h3>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink-950">
                {item.value}{' '}
                <span className="text-sm font-medium tracking-normal text-ink-500">
                  {itemCopy.valueLabel}
                </span>
              </p>
              <div className="mt-5 border-t border-ink-100 pt-4">
                <p className="text-xs font-medium text-ink-500">{itemCopy.detailLabel}</p>
                {item.status ? (
                  <Badge className="mt-2" variant={item.id === 'reports' ? 'teal' : 'health'}>
                    {itemCopy.status}
                  </Badge>
                ) : (
                  <p className="mt-1.5 truncate text-sm font-bold text-ink-800">{item.detailValue}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
