import { Bot, CheckCircle2, Database, KeyRound, Radio, ShieldCheck } from 'lucide-react';

import { Badge, Card } from '../../../components/ui/index.js';

const serviceIcons = {
  database: Database,
  authentication: KeyRound,
  ai: Bot,
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function SystemHealth({ copy, services }) {
  return (
    <section aria-labelledby="system-health-title">
      <Card className="overflow-hidden border-medical-100 bg-gradient-to-b from-white to-medical-50/60 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-medical-700">
              {copy.health.eyebrow}
            </p>
            <h2 id="system-health-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
              {copy.health.title}
            </h2>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-medical-100 bg-white text-medical-700 shadow-card">
            <Radio className="size-5" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-500">{copy.health.description}</p>

        <div className="mt-6 space-y-3">
          {services.map((service) => {
            const Icon = serviceIcons[service.id];

            return (
              <div key={service.id} className="flex items-center gap-3 rounded-2xl border border-medical-100/80 bg-white/80 p-3.5 shadow-card">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-700">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{copy.health.services[service.id]}</p>
                  <p className="mt-0.5 text-[0.68rem] text-ink-500">
                    {format(copy.health.response, { time: service.response })}
                  </p>
                </div>
                <Badge className="shrink-0 px-2.5" variant={service.status === 'healthy' ? 'health' : 'teal'}>
                  {service.status === 'healthy' ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <ShieldCheck className="size-3" aria-hidden="true" />}
                  {copy.health.statuses[service.status]}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-white bg-white/70 p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-health-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {copy.health.stable}
          </p>
          <p className="mt-2 text-[0.68rem] leading-5 text-ink-500">{copy.health.mockNote}</p>
        </div>
      </Card>
    </section>
  );
}
