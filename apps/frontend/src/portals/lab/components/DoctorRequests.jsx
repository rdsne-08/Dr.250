import { ArrowRight, ClipboardPlus, Stethoscope } from 'lucide-react';

import { Avatar, Badge, Button, Card } from '../../../components/ui/index.js';

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function DoctorRequests({ copy, requests }) {
  return (
    <section aria-labelledby="doctor-requests-title">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
              {copy.requests.eyebrow}
            </p>
            <h2 id="doctor-requests-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
              {copy.requests.title}
            </h2>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-health-50 text-health-700">
            <ClipboardPlus className="size-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-ink-100 p-3.5 transition hover:border-health-200 hover:bg-health-50/40">
              <div className="flex items-start gap-3">
                <Avatar name={request.doctor.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink-900">{request.doctor.name}</h3>
                      <p className="mt-0.5 truncate text-[0.68rem] text-ink-500">{request.doctor.specialty}</p>
                    </div>
                    <Badge className="shrink-0" variant={request.priority === 'urgent' ? 'warning' : 'neutral'}>
                      {copy.requests.priority[request.priority]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5">
                    <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-health-600" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-bold text-ink-800">{request.test.name}</p>
                      <p className="mt-0.5 text-[0.68rem] text-ink-500">
                        {format(copy.requests.forPatient, { patient: request.patient.name })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Button className="mt-4" variant="ghost" size="sm">
          {copy.requests.viewAll}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
