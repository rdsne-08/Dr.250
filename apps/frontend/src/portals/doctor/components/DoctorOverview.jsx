import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardClock,
  Clock3,
  FileSearch,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react';

import { Avatar, Badge, Button, Card } from '../../../components/ui/index.js';

const statIcons = {
  patients: UsersRound,
  reports: FileSearch,
  consultations: Stethoscope,
};

const statStyles = {
  patients: 'bg-health-50 text-health-700',
  reports: 'bg-amber-50 text-amber-700',
  consultations: 'bg-medical-50 text-medical-700',
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function DoctorOverview({ appointments, copy, doctor, stats }) {
  const currentAppointment = appointments[0];

  return (
    <section aria-labelledby="doctor-overview-title">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
            {copy.overview.eyebrow}
          </p>
          <h1
            id="doctor-overview-title"
            className="mt-2 text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl"
          >
            {copy.overview.greeting}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500 sm:text-base">
            {copy.overview.message}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-health-100 bg-white px-4 py-2 text-xs font-semibold text-ink-600 shadow-card">
          <span className="size-2 rounded-full bg-health-500 shadow-[0_0_0_4px_rgba(32,169,127,0.12)]" />
          {copy.overview.available}
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(19rem,0.72fr)_minmax(30rem,1.28fr)]">
        <Card
          id="doctor-profile"
          className="animate-fade-up overflow-hidden border-health-100 bg-gradient-to-br from-white via-white to-health-50 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <Badge>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {copy.overview.profileLabel}
            </Badge>
            <span className="grid size-9 place-items-center rounded-xl border border-health-100 bg-white text-health-700">
              <Stethoscope className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-7 flex items-center gap-4">
            <Avatar className="ring-4 ring-white shadow-card" name={doctor.name} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-[-0.025em] text-ink-950">
                {doctor.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-health-700">{doctor.specialty}</p>
              <p className="mt-1 text-xs text-ink-500">{doctor.qualification}</p>
            </div>
          </div>
          <div className="mt-7 border-t border-health-100 pt-5">
            <p className="text-xs font-semibold leading-5 text-ink-500">{doctor.hospital}</p>
            <p className="mt-1.5 text-xs font-bold text-ink-700">{doctor.id}</p>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden border-0 bg-ink-950 p-0 text-white shadow-lift animation-delay-150">
          <div className="relative isolate h-full overflow-hidden p-5 sm:p-7">
            <div
              className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-health-500/20 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-28 left-1/3 -z-10 size-64 rounded-full bg-medical-500/15 blur-3xl"
              aria-hidden="true"
            />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-health-300">
                  <CalendarCheck2 className="size-4" aria-hidden="true" />
                  {copy.overview.scheduleLabel}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">
                  {copy.overview.scheduleCount}
                </h2>
              </div>
              <Badge className="border-white/10 bg-white/10 text-white" variant="neutral">
                <Clock3 className="size-3.5" aria-hidden="true" />
                {currentAppointment.time}
              </Badge>
            </div>

            <div className="mt-7 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:flex-row sm:items-center">
              <Avatar className="bg-health-200 text-health-900" name={currentAppointment.patientName} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-health-200">{copy.overview.nextPatient}</p>
                <h3 className="mt-1 text-xl font-bold">{currentAppointment.patientName}</h3>
                <p className="mt-1 text-sm text-white/65">
                  {format(copy.overview.age, { age: currentAppointment.age })} · {currentAppointment.reason}
                </p>
              </div>
              <Button className="shrink-0 border-white/20 bg-white text-ink-950 hover:bg-health-50" variant="secondary" size="sm">
                {copy.overview.openRecord}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                <span className="text-white/70">{copy.overview.queueProgress}</span>
                <span className="text-health-200">
                  {copy.overview.completed} · {copy.overview.remaining}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-health-300 to-medical-300" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = statIcons[stat.id] ?? ClipboardClock;
          const itemCopy = copy.overview.stats[stat.id];

          return (
            <Card
              key={stat.id}
              interactive
              className="animate-fade-up p-5"
              style={{ animationDelay: `${180 + index * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-10 place-items-center rounded-2xl ${statStyles[stat.id]}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-health-700">
                  {stat.id === 'patients' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
                  {itemCopy.trend}
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-ink-700">{itemCopy.title}</h3>
                  <p className="mt-1 text-xs text-ink-500">{itemCopy.detail}</p>
                </div>
                <p className="text-3xl font-bold tracking-[-0.045em] text-ink-950">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
