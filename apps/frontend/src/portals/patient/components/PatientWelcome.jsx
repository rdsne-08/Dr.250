import { CalendarDays, Check, Droplets, Pill, ShieldCheck } from 'lucide-react';

import { Avatar, Badge, Card } from '../../../components/ui/index.js';

export function PatientWelcome({ copy, patient }) {
  const summary = [
    { id: 'bloodGroup', icon: Droplets, value: patient.bloodGroup },
    { id: 'medicines', icon: Pill, value: patient.activeMedicines },
    { id: 'nextCheckup', icon: CalendarDays, value: copy.welcome.checkupDate },
  ];

  return (
    <section id="patient-profile" className="scroll-mt-24 animate-fade-up">
      <Card className="relative overflow-hidden border-health-100 bg-white p-5 sm:p-7 lg:p-8">
        <div className="absolute -right-14 -top-20 size-64 rounded-full border-[2.5rem] border-health-50" aria-hidden="true" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4 sm:items-center">
            <Avatar className="ring-4 ring-health-50" name={patient.name} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
                {copy.welcome.eyebrow}
              </p>
              <h1 className="mt-2 text-balance text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
                {copy.welcome.greeting.replace('{name}', patient.name)}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-ink-500 sm:text-base">
                <Check className="size-4 shrink-0 text-health-600" strokeWidth={2.5} aria-hidden="true" />
                {copy.welcome.message}
              </p>
            </div>
          </div>

          <Badge className="w-fit bg-white px-4 py-2 text-sm" variant="teal">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {copy.welcome.protected}
          </Badge>
        </div>

        <div className="relative mt-7 border-t border-ink-100 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-ink-500">
            {copy.welcome.summaryLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {summary.map(({ icon: Icon, id, value }) => (
              <div key={id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-health-700 shadow-card">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium text-ink-500">{copy.welcome[id]}</p>
                  <p className="mt-0.5 font-bold text-ink-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
