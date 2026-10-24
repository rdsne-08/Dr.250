import { FileHeart, FlaskConical, Pill, Stethoscope } from 'lucide-react';

import { Card, EmptyState } from '../../../components/ui/index.js';

const eventIcons = {
  report: FlaskConical,
  visit: Stethoscope,
  prescription: Pill,
  record: FileHeart,
};

export function HealthTimeline({ copy, events, language = 'en' }) {
  return (
    <Card id="health-timeline" className="scroll-mt-24 p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
            {copy.timeline.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
            {copy.timeline.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">{copy.timeline.description}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          className="mt-6 min-h-56 shadow-none"
          icon={FileHeart}
          title={copy.states.emptyTimelineTitle}
          description={copy.states.emptyTimelineBody}
        />
      ) : (
        <div className="relative mt-7 space-y-1">
          <div className="absolute bottom-8 left-5 top-5 w-px bg-health-100" aria-hidden="true" />
          {events.map((event, index) => {
          const Icon = eventIcons[event.type];
          const eventDate = event.date[language];

          return (
            <article
              key={event.id}
              className="relative flex animate-fade-up gap-4 rounded-2xl px-0 py-3 sm:px-2"
              style={{ animationDelay: `${160 + index * 80}ms` }}
            >
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-4 border-white bg-health-100 text-health-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pb-2">
                <p className="text-xs font-bold text-health-700">{eventDate}</p>
                <h3 className="mt-1 text-base font-bold text-ink-900">{event.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-500">{event.detail}</p>
              </div>
            </article>
          );
          })}
        </div>
      )}

    </Card>
  );
}
