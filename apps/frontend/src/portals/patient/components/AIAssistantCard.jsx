import { ArrowRight, Bot, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

import { Button, Card } from '../../../components/ui/index.js';

export function AIAssistantCard({ assistant, copy }) {
  return (
    <Card id="ai-assistant" className="scroll-mt-24 overflow-hidden border-medical-100 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-medical-700">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {copy.assistant.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
            {copy.assistant.title}
          </h2>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-medical-100 text-medical-700">
          <Bot className="size-6" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500">{copy.assistant.description}</p>

      <div className="mt-6 rounded-3xl bg-medical-50 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-xs font-bold text-medical-800">
          <MessageCircle className="size-4" aria-hidden="true" />
          {copy.assistant.promptLabel}
        </p>
        <p className="mt-3 text-base font-semibold leading-7 text-ink-800">
          {copy.assistant.prompts[assistant.suggestedPrompt]}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline">
          {copy.assistant.openAssistant}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <p className="flex max-w-xs items-start gap-2 text-xs leading-5 text-ink-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-medical-600" aria-hidden="true" />
          {copy.assistant.safety}
        </p>
      </div>
    </Card>
  );
}
