import { BellRing, CheckCircle2, FileUp, ShieldCheck } from 'lucide-react';

import { Badge, Card } from '../../../components/ui/index.js';

const eventIcons = {
  completed: CheckCircle2,
  uploaded: FileUp,
  notified: BellRing,
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function ReportTimeline({ copy, events }) {
  return (
    <section id="report-history" className="scroll-mt-24" aria-labelledby="report-history-title">
      <Card className="h-full border-health-100 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
              {copy.history.eyebrow}
            </p>
            <h2 id="report-history-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
              {copy.history.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">{copy.history.description}</p>
          </div>
          <Badge className="shrink-0" variant="health">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {copy.history.secure}
          </Badge>
        </div>

        <div className="relative mt-7 space-y-1">
          <div className="absolute bottom-8 left-5 top-5 w-px bg-health-100" aria-hidden="true" />
          {events.map((event, index) => {
            const Icon = eventIcons[event.id];
            const eventCopy = copy.history.events[event.id];

            return (
              <article
                key={`${event.id}-${event.time}`}
                className="relative flex animate-fade-up gap-4 rounded-2xl py-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-4 border-white bg-health-100 text-health-700">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-health-700">{event.time}</p>
                    <p className="text-[0.68rem] font-semibold text-ink-400">
                      {format(copy.history.reportLabel, { id: event.reportId })}
                    </p>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-ink-900">{eventCopy.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-ink-500">{eventCopy.detail}</p>
                  <p className="mt-1.5 text-[0.68rem] font-semibold text-ink-400">{event.patient.name} · {event.patient.id}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
