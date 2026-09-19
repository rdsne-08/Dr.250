import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Microscope,
  Stethoscope,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, Badge, Button, Card } from '../../../components/ui/index.js';
import { cn } from '../../../lib/classNames.js';

const filters = ['all', 'pending', 'processing', 'completed'];

const statusIcons = {
  pending: Clock3,
  processing: Microscope,
  completed: CheckCircle2,
};

const statusStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-medical-200 bg-medical-50 text-medical-800',
  completed: 'border-health-200 bg-health-50 text-health-800',
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function TestManagement({ copy, tests }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const visibleTests = useMemo(
    () => tests.filter((test) => activeFilter === 'all' || test.status === activeFilter),
    [activeFilter, tests],
  );

  return (
    <section id="test-management" className="scroll-mt-24" aria-labelledby="test-management-title">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-medical-700">
            {copy.tests.eyebrow}
          </p>
          <h2 id="test-management-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
            {copy.tests.title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink-500">{copy.tests.description}</p>
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-ink-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  'min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-100',
                  activeFilter === filter
                    ? 'border-medical-600 bg-medical-600 text-white shadow-card'
                    : 'border-ink-100 bg-white text-ink-600 hover:border-medical-200 hover:bg-medical-50 hover:text-medical-800',
                )}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {copy.tests.filters[filter]}
              </button>
            ))}
          </div>
          <p className="shrink-0 text-xs font-bold text-ink-500" aria-live="polite">
            {format(copy.tests.showing, { count: visibleTests.length })}
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {visibleTests.map((test, index) => {
            const StatusIcon = statusIcons[test.status];

            return (
              <article
                key={test.id}
                className="group animate-fade-up rounded-3xl border border-ink-100 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card sm:p-5"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar name={test.patient.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-ink-950">{test.patient.name}</h3>
                        {test.priority === 'urgent' ? (
                          <Badge variant="warning">{copy.tests.priority.urgent}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-500">
                        {copy.tests.patientId} · {test.patient.id}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-700">
                          <FlaskConical className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-800">{test.name}</p>
                          <p className="mt-0.5 text-[0.68rem] font-semibold text-medical-700">{test.shortName} · {test.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 border-y border-ink-100 py-4 sm:grid-cols-3 xl:w-[31rem] xl:border-x xl:border-y-0 xl:px-5 xl:py-0">
                    <div>
                      <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-ink-500">
                        <Stethoscope className="size-3.5 text-health-600" aria-hidden="true" />
                        {copy.tests.requestedBy}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-ink-800">{test.doctor.name}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-ink-500">
                        <CalendarClock className="size-3.5 text-health-600" aria-hidden="true" />
                        {copy.tests.requestedAt}
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink-800">{test.requestedAt}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-ink-500">
                        <Clock3 className="size-3.5 text-health-600" aria-hidden="true" />
                        {copy.tests.due}
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink-800">{test.dueAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 xl:w-44 xl:justify-end">
                    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${statusStyles[test.status]}`}>
                      <StatusIcon className="size-3.5" aria-hidden="true" />
                      {copy.tests.statuses[test.status]}
                    </span>
                    <Button variant="ghost" size="icon" aria-label={`${copy.tests.openTest}: ${test.patient.name}`}>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}

          {visibleTests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-100 px-5 py-12 text-center">
              <FlaskConical className="mx-auto size-6 text-ink-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink-500">{copy.tests.noResults}</p>
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
