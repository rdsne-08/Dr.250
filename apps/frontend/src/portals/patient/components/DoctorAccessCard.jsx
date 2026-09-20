import { Clock3, QrCode, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';

import { Badge, Button, Card } from '../../../components/ui/index.js';

export function DoctorAccessCard({ access, copy }) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-7">
      <div className="absolute -right-16 -top-16 size-48 rounded-full bg-health-50" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
              {copy.doctorAccess.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
              {copy.doctorAccess.title}
            </h2>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-health-100 text-health-700">
            <QrCode className="size-6" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500">
          {copy.doctorAccess.description}
        </p>

        <div className="mt-6 rounded-2xl border border-ink-100 bg-canvas p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-health-700 shadow-card">
                <Stethoscope className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{access.doctorName}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {copy.doctorAccess.specialty[access.specialty]}
                </p>
              </div>
            </div>
            <Badge className="w-fit" variant="teal">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {access.activeSessions} {copy.doctorAccess.activeSessions}
            </Badge>
          </div>
          <p className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3 text-xs font-semibold text-ink-500">
            <Clock3 className="size-4 text-health-600" aria-hidden="true" />
            {copy.doctorAccess.expires.replace('{time}', access.expiresAt)}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button>
            <QrCode className="size-4" aria-hidden="true" />
            {copy.doctorAccess.generateQr}
          </Button>
          <p className="flex max-w-xs items-start gap-2 text-xs leading-5 text-ink-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-health-600" aria-hidden="true" />
            {copy.doctorAccess.secureNote}
          </p>
        </div>
      </div>
    </Card>
  );
}
