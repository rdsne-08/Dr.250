import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardClock,
  FileCheck2,
  FlaskConical,
  ShieldCheck,
  TestTubes,
  UsersRound,
} from 'lucide-react';

import { Badge, Card } from '../../../components/ui/index.js';

const overviewIcons = {
  pending: ClipboardClock,
  completed: FileCheck2,
  urgent: AlertCircle,
  patients: UsersRound,
};

const overviewStyles = {
  pending: 'bg-health-50 text-health-700',
  completed: 'bg-medical-50 text-medical-700',
  urgent: 'bg-amber-50 text-amber-700',
  patients: 'bg-health-100 text-health-800',
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function LabOverview({ copy, laboratory, overview, workload }) {
  return (
    <>
      <section aria-labelledby="lab-welcome-title">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(24rem,0.82fr)]">
          <Card className="animate-fade-up overflow-hidden border-medical-100 bg-gradient-to-br from-white via-medical-50/40 to-health-50 p-5 sm:p-7">
            <div className="relative isolate">
              <div className="absolute -right-16 -top-20 -z-10 size-52 rounded-full bg-medical-200/35 blur-3xl" aria-hidden="true" />
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-medical-700">
                    {copy.welcome.eyebrow}
                  </p>
                  <h1 id="lab-welcome-title" className="mt-2 max-w-3xl text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
                    {format(copy.welcome.greeting, { name: laboratory.name })}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500 sm:text-base">
                    {copy.welcome.message}
                  </p>
                </div>
                <Badge className="shrink-0 border-medical-200 bg-white/80 text-medical-800" variant="teal">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {copy.welcome.verified}
                </Badge>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-medical-100 pt-5 text-xs font-semibold text-ink-500">
                <span className="flex items-center gap-2">
                  <FlaskConical className="size-4 text-medical-600" aria-hidden="true" />
                  {laboratory.branch}
                </span>
                <span className="hidden size-1 rounded-full bg-ink-300 sm:block" aria-hidden="true" />
                <span>{laboratory.id}</span>
              </div>
            </div>
          </Card>

          <Card className="animate-fade-up border-health-100 p-5 sm:p-6 animation-delay-150">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
                  {copy.welcome.workload}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-ink-950">
                  {copy.welcome.workloadMessage}
                </h2>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-health-50 text-health-700">
                <TestTubes className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: copy.welcome.pending, value: workload.pending },
                { label: copy.welcome.completed, value: workload.completed },
                { label: copy.welcome.samples, value: workload.samples },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-canvas p-3 text-center">
                  <p className="text-2xl font-bold tracking-[-0.04em] text-ink-950">{item.value}</p>
                  <p className="mt-1 text-[0.65rem] font-semibold leading-4 text-ink-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 text-[0.68rem] font-semibold">
                <span className="text-ink-500">{copy.welcome.workflow}</span>
                <span className="text-health-700">{copy.welcome.workflowProgress}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-health-50">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-health-500 to-medical-400" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="test-overview-title">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
              {copy.overview.eyebrow}
            </p>
            <h2 id="test-overview-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
              {copy.overview.title}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink-500">{copy.overview.description}</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {overview.map((item, index) => {
            const Icon = overviewIcons[item.id];
            const itemCopy = copy.overview.items[item.id];

            return (
              <Card
                key={item.id}
                interactive
                className="animate-fade-up p-5"
                style={{ animationDelay: `${180 + index * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-11 place-items-center rounded-2xl ${overviewStyles[item.id]}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight className="size-4 text-ink-300" aria-hidden="true" />
                </div>
                <p className="mt-5 text-3xl font-bold tracking-[-0.045em] text-ink-950">{item.value}</p>
                <h3 className="mt-1 text-sm font-bold text-ink-800">{itemCopy.title}</h3>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3 text-xs">
                  <span className="text-ink-500">{itemCopy.detail}</span>
                  <span className="flex items-center gap-1 font-bold text-health-700">
                    {item.id === 'completed' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
                    {itemCopy.trend}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
