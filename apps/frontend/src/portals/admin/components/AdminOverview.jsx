import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Database,
  FileHeart,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react';

import { Avatar, Badge, Card } from '../../../components/ui/index.js';

const overviewIcons = {
  patients: UsersRound,
  doctors: Stethoscope,
  labs: Building2,
  records: FileHeart,
};

const overviewStyles = {
  patients: 'bg-health-50 text-health-700',
  doctors: 'bg-medical-50 text-medical-700',
  labs: 'bg-health-100 text-health-800',
  records: 'bg-medical-100 text-medical-800',
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function AdminOverview({ admin, copy, overview, platform }) {
  return (
    <>
      <section aria-labelledby="admin-welcome-title">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(25rem,0.8fr)]">
          <Card className="animate-fade-up overflow-hidden border-health-100 bg-gradient-to-br from-white via-white to-health-50 p-5 sm:p-7">
            <div className="relative isolate">
              <div className="absolute -right-20 -top-24 -z-10 size-64 rounded-full bg-health-200/35 blur-3xl" aria-hidden="true" />
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
                    {copy.welcome.eyebrow}
                  </p>
                  <h1 id="admin-welcome-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
                    {format(copy.welcome.greeting, { name: admin.name })}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500 sm:text-base">
                    {copy.welcome.message}
                  </p>
                </div>
                <Badge className="shrink-0 border-health-200 bg-white/80 text-health-800">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {copy.welcome.profile}
                </Badge>
              </div>

              <div className="mt-8 flex items-center gap-3 border-t border-health-100 pt-5">
                <Avatar className="ring-4 ring-white shadow-card" name={admin.name} size="md" />
                <div>
                  <p className="text-sm font-bold text-ink-900">{admin.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{admin.shift} · {admin.id}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="animate-fade-up border-medical-100 p-5 animation-delay-150">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-medical-50 text-medical-700">
                  <HeartHandshake className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-ink-500">{copy.welcome.statusTitle}</p>
                      <h2 className="mt-1 text-base font-bold text-ink-950">{copy.welcome.statusMessage}</h2>
                    </div>
                    <Badge variant="teal">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      {copy.welcome.operational}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="animate-fade-up border-health-100 p-5" style={{ animationDelay: '220ms' }}>
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-health-50 text-health-700">
                  <Database className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-ink-500">{copy.welcome.securityTitle}</p>
                      <h2 className="mt-1 text-base font-bold text-ink-950">{copy.welcome.securityMessage}</h2>
                    </div>
                    <Badge>
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {copy.welcome.protected}
                    </Badge>
                  </div>
                  <p className="mt-3 text-[0.68rem] font-semibold text-ink-400">
                    {format(copy.welcome.reviewed, { time: platform.reviewedAt })}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="platform-overview-title">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-medical-700">
              {copy.overview.eyebrow}
            </p>
            <h2 id="platform-overview-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
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
                  <span className="font-bold text-health-700">{itemCopy.trend}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
