import { ArrowLeft, Construction, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DNAAnimation } from '../background/DNAAnimation.jsx';
import { BrandMark } from '../layout/BrandMark.jsx';
import { Badge, Button, Card } from '../ui/index.js';

export function PortalPlaceholder({ description, icon: Icon, role, title }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-12">
      <DNAAnimation className="absolute right-0 top-0 h-full w-[32rem] opacity-50" />
      <div className="hero-grid absolute inset-0" aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-2xl p-7 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BrandMark />
          <Badge>{role}</Badge>
        </div>

        <div className="mt-12 grid size-16 place-items-center rounded-3xl bg-health-100 text-health-700">
          <Icon className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-7 text-balance text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-ink-500">{description}</p>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-medical-100 bg-medical-50 p-4 text-medical-900">
          <Construction className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">
            This route is prepared as part of the frontend foundation. Portal workflows will be
            added in the next product phase.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button as={Link} to="/" variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Button>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500">
            <ShieldCheck className="size-4 text-health-600" aria-hidden="true" />
            Secure role access will be applied here
          </span>
        </div>
      </Card>
    </main>
  );
}
