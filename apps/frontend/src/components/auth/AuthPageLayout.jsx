import { ArrowLeft, CheckCircle2, Languages, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DNAAnimation } from '../background/DNAAnimation.jsx';
import { BrandMark } from '../layout/BrandMark.jsx';
import { Badge, Button, Card } from '../ui/index.js';

export function AuthPageLayout({ children, copy, modeCopy, onToggleLanguage }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <DNAAnimation className="absolute -right-44 top-0 h-full w-[38rem] opacity-40" />
      <div className="hero-grid absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[90rem] flex-col px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleLanguage} aria-label={copy.switchLanguage}>
              <Languages className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{copy.languageName}</span>
            </Button>
            <Button as={Link} to="/" variant="secondary" size="sm">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{copy.shared.backHome}</span>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(31rem,0.68fr)] lg:py-12">
          <section className="hidden max-w-xl lg:block">
            <Badge className="bg-white/80">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {copy.shared.secure}
            </Badge>
            <h2 className="mt-6 text-balance text-4xl font-bold tracking-[-0.05em] text-ink-950 xl:text-5xl">
              {modeCopy.panelTitle}
            </h2>
            <p className="mt-5 text-base leading-8 text-ink-500">{modeCopy.panelBody}</p>
            <div className="mt-8 space-y-3">
              {modeCopy.features.map((feature) => (
                <p key={feature} className="flex items-center gap-3 text-sm font-semibold text-ink-700">
                  <span className="grid size-7 place-items-center rounded-full bg-health-100 text-health-700">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </span>
                  {feature}
                </p>
              ))}
            </div>
          </section>

          <Card className="mx-auto w-full max-w-xl border-health-100 bg-white/95 p-5 shadow-lift backdrop-blur-xl sm:p-8">
            {children}
          </Card>
        </div>
      </div>
    </main>
  );
}
