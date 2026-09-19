import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FilePenLine,
  Laptop,
  MapPin,
  Plus,
  Save,
  ShieldAlert,
} from 'lucide-react';

import { Avatar, Badge, Button, Card, EmptyState } from '../../../components/ui/index.js';

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function ConsultationWorkspace({ appointments, copy }) {
  return (
    <section id="consultation-workspace" className="scroll-mt-24" aria-labelledby="consultation-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
          {copy.consultation.eyebrow}
        </p>
        <h2 id="consultation-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
          {copy.consultation.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
          {copy.consultation.description}
        </p>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(26rem,1.28fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <CalendarDays className="size-5 text-health-600" aria-hidden="true" />
              {copy.consultation.upcoming}
            </h3>
            <Button className="hidden px-3 sm:inline-flex" variant="ghost" size="sm">
              {copy.consultation.allAppointments}
            </Button>
          </div>

          {appointments.length === 0 ? (
            <EmptyState
              className="mt-5 min-h-56 shadow-none"
              icon={CalendarDays}
              title={copy.states.noAppointmentsTitle}
              description={copy.states.noAppointmentsBody}
            />
          ) : (
            <div className="mt-5 space-y-3">
              {appointments.slice(0, 3).map((appointment) => {
              const ModeIcon = appointment.mode === 'video' ? Laptop : MapPin;

              return (
                <article
                  key={appointment.id}
                  className={`rounded-2xl border p-3.5 transition ${
                    appointment.status === 'active'
                      ? 'border-health-200 bg-health-50'
                      : 'border-ink-100 bg-white hover:border-health-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 text-center">
                      <p className="text-sm font-bold text-ink-900">{appointment.time}</p>
                      <span className="mt-1.5 block h-5 w-px bg-health-200 mx-auto" aria-hidden="true" />
                    </div>
                    <Avatar name={appointment.patientName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-sm font-bold text-ink-900">{appointment.patientName}</h4>
                        {appointment.status === 'active' ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-health-500 shadow-[0_0_0_4px_rgba(32,169,127,0.12)]" />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-ink-500">{appointment.reason}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold text-ink-500">
                        <span>{format(copy.consultation.age, { age: appointment.age })}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <ModeIcon className="size-3" aria-hidden="true" />
                          {copy.consultation.modes[appointment.mode]}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
              })}
            </div>
          )}

          {appointments.length > 0 ? (
            <Button className="mt-4 w-full sm:hidden" variant="ghost" size="sm">
              {copy.consultation.allAppointments}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </Card>

        <Card id="prescription-draft" className="scroll-mt-24 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
                <FilePenLine className="size-5 text-health-600" aria-hidden="true" />
                {copy.consultation.prescription}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-ink-500">{copy.consultation.prescriptionHint}</p>
            </div>
            <Badge variant="neutral">Riddhi Das · DR250-2048</Badge>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-ink-100">
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-px bg-ink-100 text-xs font-bold text-ink-600">
              <div className="bg-ink-50 px-4 py-3">{copy.consultation.medicine}</div>
              <div className="bg-ink-50 px-4 py-3">{copy.consultation.dosage}</div>
            </div>
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-px bg-ink-100">
              <div className="min-h-16 bg-white p-3">
                <div className="h-10 rounded-xl border border-dashed border-ink-100 bg-canvas" />
              </div>
              <div className="min-h-16 bg-white p-3">
                <div className="h-10 rounded-xl border border-dashed border-ink-100 bg-canvas" />
              </div>
            </div>
          </div>

          <Button className="mt-3" variant="ghost" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            {copy.consultation.addMedicine}
          </Button>

          <div className="mt-5 border-t border-ink-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-ink-900">{copy.consultation.notes}</h3>
                <p className="mt-1 text-xs text-ink-500">{copy.consultation.notesHint}</p>
              </div>
              <CheckCircle2 className="size-5 text-health-500" aria-hidden="true" />
            </div>
            <textarea
              className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-ink-100 bg-canvas px-4 py-3 text-sm leading-6 text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-health-500 focus:ring-4 focus:ring-health-100"
              placeholder={copy.consultation.notesPlaceholder}
              aria-label={copy.consultation.notes}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex max-w-sm items-start gap-2 text-[0.68rem] leading-5 text-ink-500">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-health-600" aria-hidden="true" />
              {copy.consultation.draftNotice}
            </p>
            <Button size="sm">
              <Save className="size-4" aria-hidden="true" />
              {copy.consultation.saveDraft}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
