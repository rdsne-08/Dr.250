import { ArrowLeft, KeyRound, UserRoundPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DNAAnimation } from '../../components/background/DNAAnimation.jsx';
import { BrandMark } from '../../components/layout/BrandMark.jsx';
import { Badge, Button, Card } from '../../components/ui/index.js';

const pageContent = {
  login: {
    badge: 'Welcome back',
    title: 'Your secure sign-in space is ready for integration.',
    description:
      'The route and visual foundation are prepared. Authentication fields and API connection will be added with the dedicated auth experience.',
    icon: KeyRound,
    switchText: 'New to Dr.250?',
    switchLabel: 'Create an account',
    switchTo: '/register',
  },
  register: {
    badge: 'Start your health space',
    title: 'A simpler health journey starts here.',
    description:
      'Registration is intentionally a placeholder in this foundation. Account creation and role onboarding will be connected in the authentication phase.',
    icon: UserRoundPlus,
    switchText: 'Already have an account?',
    switchLabel: 'Log in',
    switchTo: '/login',
  },
};

export function AuthPlaceholderPage({ mode }) {
  const content = pageContent[mode];
  const Icon = content.icon;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-12">
      <DNAAnimation className="absolute -right-28 top-0 h-full w-[34rem] opacity-50" />
      <div className="hero-grid absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg">
        <BrandMark className="mb-8" />
        <Card className="p-7 sm:p-10">
          <span className="grid size-14 place-items-center rounded-2xl bg-health-100 text-health-700">
            <Icon className="size-7" aria-hidden="true" />
          </span>
          <Badge className="mt-7">{content.badge}</Badge>
          <h1 className="mt-5 text-balance text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink-500">{content.description}</p>

          <div className="mt-8 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button as={Link} to="/" variant="secondary">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back home
            </Button>
            <p className="text-sm text-ink-500">
              {content.switchText}{' '}
              <Link className="font-bold text-health-700 hover:text-health-800" to={content.switchTo}>
                {content.switchLabel}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
