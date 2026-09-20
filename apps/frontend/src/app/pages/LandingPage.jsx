import {
  ArrowRight,
  Bot,
  Check,
  ClipboardCheck,
  FileHeart,
  FlaskConical,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { DNAAnimation } from '../../components/background/DNAAnimation.jsx';
import { SiteFooter } from '../../components/layout/SiteFooter.jsx';
import { SiteHeader } from '../../components/layout/SiteHeader.jsx';
import { Badge, Button, Card } from '../../components/ui/index.js';
import { useLanguage } from '../../hooks/useLanguage.js';

const featureIcons = [FileHeart, Stethoscope, FlaskConical, Bot];
const processIcons = [UserRoundCheck, ClipboardCheck, ShieldCheck];

function SectionIntro({ body, centered = false, eyebrow, inverted = false, title }) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      <p className={`text-sm font-bold uppercase tracking-[0.18em] ${inverted ? 'text-health-300' : 'text-health-700'}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-4 text-balance text-3xl font-bold tracking-[-0.045em] sm:text-4xl lg:text-5xl ${inverted ? 'text-white' : 'text-ink-900'}`}>
        {title}
      </h2>
      {body ? (
        <p className={`mt-5 text-lg leading-8 ${inverted ? 'text-ink-300' : 'text-ink-500'}`}>{body}</p>
      ) : null}
    </div>
  );
}

function HealthStoryPreview({ copy }) {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] lg:mr-0">
      <div className="absolute -inset-8 rounded-[3rem] bg-health-100/55 blur-3xl" aria-hidden="true" />
      <Card className="relative overflow-hidden border-white/90 p-4 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">
              {copy.previewLabel}
            </p>
            <h2 className="mt-2 max-w-xs text-xl font-bold leading-7 text-ink-900">
              {copy.previewTitle}
            </h2>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-health-600 text-white">
            <FileHeart className="size-5" aria-hidden="true" />
          </span>
        </div>

        <div className="relative mt-6 space-y-5">
          <div className="absolute bottom-4 left-[1.2rem] top-4 w-px bg-health-100" aria-hidden="true" />
          {copy.timeline.map((item, index) => (
            <div key={item.title} className="relative flex gap-4">
              <span
                className={`relative z-10 mt-1.5 size-10 shrink-0 rounded-full border-[6px] border-white ${
                  index === 0 ? 'bg-health-500' : 'bg-health-200'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-canvas px-4 py-3.5">
                <p className="text-xs font-semibold text-health-700">{item.label}</p>
                <p className="mt-1 font-bold text-ink-900">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-ink-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-health-100 bg-health-50 px-4 py-3 text-sm font-semibold text-health-800">
          <LockKeyhole className="size-4" aria-hidden="true" />
          {copy.previewSecure}
        </div>
      </Card>

      <div className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-card sm:flex">
        <span className="grid size-9 place-items-center rounded-full bg-medical-100 text-medical-700">
          <HeartHandshake className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold text-ink-500">Designed for people</p>
          <p className="text-sm font-bold text-ink-900">Not paperwork</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { copy } = useLanguage();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-ink-900">
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-ink-100/70">
          <DNAAnimation className="absolute -right-24 top-0 h-full w-[34rem] opacity-75 sm:right-0 lg:right-[5%]" />
          <div className="hero-grid absolute inset-0 -z-20" aria-hidden="true" />

          <div className="mx-auto grid min-h-[calc(100vh-4.75rem)] max-w-content items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
            <div className="relative z-10 max-w-3xl animate-fade-up">
              <Badge className="mb-7" variant="teal">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {copy.hero.eyebrow}
              </Badge>
              <h1 className="text-balance text-[2.75rem] font-bold leading-[1.04] tracking-[-0.06em] text-ink-950 sm:text-6xl lg:text-7xl">
                {copy.hero.titleLead}{' '}
                <span className="text-health-600">{copy.hero.titleAccent}</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-500 sm:text-xl sm:leading-9">
                {copy.hero.body}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button as={Link} to="/register" size="lg">
                  {copy.hero.primaryCta}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
                <Button as="a" href="#how-it-works" variant="secondary" size="lg">
                  {copy.hero.secondaryCta}
                </Button>
              </div>
              <p className="mt-6 flex items-start gap-2 text-sm font-medium leading-6 text-ink-500">
                <Check className="mt-0.5 size-4 shrink-0 text-health-600" aria-hidden="true" />
                {copy.hero.reassurance}
              </p>
            </div>

            <div className="relative z-10 animate-fade-up animation-delay-150">
              <HealthStoryPreview copy={copy.hero} />
            </div>
          </div>
        </section>

        <section className="border-b border-ink-100 bg-canvas" aria-label="Platform benefits">
          <div className="mx-auto grid max-w-content grid-cols-2 gap-x-5 gap-y-6 px-5 py-7 sm:px-8 lg:grid-cols-4">
            {copy.trust.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-ink-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-health-100 text-health-700">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-content">
            <SectionIntro
              centered
              eyebrow={copy.features.eyebrow}
              title={copy.features.title}
              body={copy.features.body}
            />

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {copy.features.items.map((feature, index) => {
                const Icon = featureIcons[index];

                return (
                  <Card key={feature.title} interactive className="group p-6 sm:p-7">
                    <span className="grid size-12 place-items-center rounded-2xl bg-health-50 text-health-700 transition group-hover:bg-health-600 group-hover:text-white">
                      <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-xl font-bold tracking-[-0.025em] text-ink-900">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-ink-500">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-ink-950 px-5 py-20 text-white sm:px-8 sm:py-28">
          <div className="mx-auto max-w-content">
            <SectionIntro centered inverted eyebrow={copy.process.eyebrow} title={copy.process.title} />

            <div className="relative mt-14 grid gap-5 md:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-8 hidden border-t border-dashed border-health-500/40 md:block" aria-hidden="true" />
              {copy.process.items.map((item, index) => {
                const Icon = processIcons[index];

                return (
                  <article key={item.title} className="relative rounded-3xl border border-white/10 bg-white/[0.055] p-7 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="relative z-10 grid size-16 place-items-center rounded-2xl border border-health-400/25 bg-ink-900 text-health-300">
                        <Icon className="size-7" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-bold text-health-300">0{index + 1}</span>
                    </div>
                    <h3 className="mt-7 text-xl font-bold">{item.title}</h3>
                    <p className="mt-3 leading-7 text-ink-300">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="for-everyone" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-content">
            <div className="relative overflow-hidden rounded-[2rem] border border-health-100 bg-health-50 px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
              <div className="audience-orbit absolute -right-24 -top-24 size-80 rounded-full border border-health-200/70" aria-hidden="true" />
              <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_auto]">
                <div className="max-w-3xl">
                  <SectionIntro
                    eyebrow={copy.audience.eyebrow}
                    title={copy.audience.title}
                    body={copy.audience.body}
                  />
                  <div className="mt-7 flex flex-wrap gap-2">
                    {copy.audience.roles.map((role) => (
                      <Badge key={role} className="bg-white px-4 py-2 text-sm">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button as={Link} to="/register" size="lg" className="w-full lg:w-auto">
                  {copy.audience.cta}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
