import {
  Building2,
  Check,
  FileCheck2,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, Badge, Button, Card } from '../../../components/ui/index.js';

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function VerificationCenter({ copy, requests }) {
  const [decisions, setDecisions] = useState({});
  const pendingCount = useMemo(
    () => requests.filter((request) => !decisions[request.id]).length,
    [decisions, requests],
  );

  function setDecision(id, status) {
    setDecisions((current) => ({ ...current, [id]: status }));
  }

  return (
    <section id="verification-center" className="scroll-mt-24" aria-labelledby="verification-title">
      <Card className="overflow-hidden border-health-100 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
              {copy.verification.eyebrow}
            </p>
            <h2 id="verification-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
              {copy.verification.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{copy.verification.description}</p>
          </div>
          <Badge className="shrink-0" variant={pendingCount > 0 ? 'warning' : 'health'}>
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {format(copy.verification.pendingCount, { count: pendingCount })}
          </Badge>
        </div>

        <div className="mt-6 grid gap-3">
          {requests.map((request, index) => {
            const status = decisions[request.id] ?? request.status;
            const TypeIcon = request.type === 'doctor' ? Stethoscope : Building2;
            const isPending = status === 'pending';

            return (
              <article
                key={request.id}
                className="animate-fade-up rounded-3xl border border-ink-100 bg-white p-4 transition hover:border-health-200 sm:p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar
                      className={request.type === 'laboratory' ? 'rounded-2xl bg-medical-100 text-medical-800' : ''}
                      name={request.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-health-700">
                        <TypeIcon className="size-3.5" aria-hidden="true" />
                        {copy.verification.types[request.type]}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-ink-950">{request.name}</h3>
                      <p className="mt-1 text-xs text-ink-500">{request.id}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 border-y border-ink-100 py-4 sm:grid-cols-3 xl:w-[31rem] xl:border-x xl:border-y-0 xl:px-5 xl:py-0">
                    <div className="sm:col-span-2">
                      <p className="text-[0.65rem] font-semibold text-ink-400">{copy.verification.qualification}</p>
                      <p className="mt-1 text-xs font-bold text-ink-800">{request.qualification}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-ink-400">
                        <FileCheck2 className="size-3.5 text-medical-600" aria-hidden="true" />
                        {format(copy.verification.documents, { count: request.documents })}
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink-800">
                        {format(copy.verification.submitted, { time: request.submittedAt })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 xl:w-64 xl:justify-end">
                    {isPending ? (
                      <>
                        <Button
                          className="px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDecision(request.id, 'rejected')}
                        >
                          <X className="size-4" aria-hidden="true" />
                          {copy.verification.reject}
                        </Button>
                        <Button size="sm" onClick={() => setDecision(request.id, 'approved')}>
                          <Check className="size-4" aria-hidden="true" />
                          {copy.verification.approve}
                        </Button>
                      </>
                    ) : (
                      <Badge variant={status === 'approved' ? 'health' : 'neutral'}>
                        {status === 'approved' ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                        {copy.verification.statuses[status]}
                      </Badge>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-4 flex items-center gap-2 text-[0.68rem] font-semibold text-ink-400">
          <ShieldCheck className="size-3.5 text-health-600" aria-hidden="true" />
          {copy.verification.frontendNote}
        </p>
      </Card>
    </section>
  );
}
