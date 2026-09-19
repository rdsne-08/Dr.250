import { ArrowUpRight, Check, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge, Button, Card } from '../../../components/ui/index.js';

export function ClinicalAssistant({ copy }) {
  return (
    <section id="clinical-assistant" className="scroll-mt-24" aria-labelledby="assistant-title">
      <Card className="overflow-hidden border-medical-100 bg-gradient-to-b from-white to-medical-50/70 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-medical-700">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {copy.assistant.eyebrow}
            </p>
            <h2 id="assistant-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
              {copy.assistant.title}
            </h2>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-medical-100 bg-white text-medical-700 shadow-card">
            <FileCheck2 className="size-5" aria-hidden="true" />
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-ink-500">{copy.assistant.description}</p>

        <div className="mt-6 rounded-3xl border border-white bg-white/85 p-4 shadow-card">
          <Badge variant="teal">{copy.assistant.preparedFor}</Badge>
          <h3 className="mt-4 text-base font-bold text-ink-900">{copy.assistant.insightTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-600">{copy.assistant.insightBody}</p>
        </div>

        <div className="mt-5 space-y-2.5">
          {copy.assistant.checks.map((check) => (
            <div key={check} className="flex items-center gap-3 rounded-2xl border border-medical-100/70 bg-white/60 px-3.5 py-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-medical-100 text-medical-700">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold text-ink-700">{check}</p>
            </div>
          ))}
        </div>

        <Button className="mt-6 w-full" variant="outline" size="sm">
          {copy.assistant.review}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Button>

        <p className="mt-4 flex items-start gap-2 text-[0.65rem] leading-5 text-ink-500">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-medical-600" aria-hidden="true" />
          {copy.assistant.safety}
        </p>
      </Card>
    </section>
  );
}
