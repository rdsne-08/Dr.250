import {
  Bell,
  FileHeart,
  FlaskConical,
  House,
  Languages,
  Menu,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';

import { BrandMark } from '../../../components/layout/BrandMark.jsx';
import { LogoutButton } from '../../../components/auth/LogoutButton.jsx';
import { Avatar, Button, Modal } from '../../../components/ui/index.js';
import { cn } from '../../../lib/classNames.js';

const navigation = [
  { id: 'dashboard', href: '#patient-dashboard', icon: House },
  { id: 'records', href: '#health-overview', icon: FileHeart },
  { id: 'doctors', href: '#quick-actions', icon: Stethoscope },
  { id: 'reports', href: '#health-timeline', icon: FlaskConical },
  { id: 'prescriptions', href: '#health-overview', icon: Pill },
  { id: 'profile', href: '#patient-profile', icon: UserRound },
];

function NavigationItems({ compact = false, copy, onNavigate }) {
  return navigation.map(({ href, icon: Icon, id }) => (
    <a
      key={id}
      href={href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100',
        compact ? 'flex-col gap-1 px-2 py-2 text-[0.68rem]' : 'gap-3 px-4 py-3 text-sm',
        id === 'dashboard'
          ? 'bg-health-50 text-health-800'
          : 'text-ink-500 hover:bg-health-50 hover:text-health-800',
      )}
      aria-current={id === 'dashboard' ? 'page' : undefined}
    >
      <Icon
        className={cn('shrink-0', compact ? 'size-5' : 'size-5')}
        strokeWidth={id === 'dashboard' ? 2.4 : 2}
        aria-hidden="true"
      />
      <span>{copy.nav[id]}</span>
    </a>
  ));
}

export function PatientLayout({ children, copy, onToggleLanguage, patient }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimaryItems = navigation.filter(({ id }) =>
    ['dashboard', 'records', 'profile'].includes(id),
  );

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-ink-100 bg-white px-5 py-6 lg:sticky lg:top-0 lg:flex">
        <div className="flex items-center justify-between">
          <BrandMark />
          <span className="rounded-full bg-health-50 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-health-700">
            {copy.sidebar.portal}
          </span>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ink-100 bg-canvas p-3">
          <Avatar name={patient.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{patient.name}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {copy.sidebar.patientId} · {patient.id}
            </p>
          </div>
        </div>

        <nav className="mt-7 flex flex-col gap-1" aria-label={copy.navigationLabel}>
          <NavigationItems copy={copy} />
        </nav>

        <div className="mt-auto rounded-2xl border border-health-100 bg-health-50 p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-health-700 shadow-card">
            <ShieldCheck className="size-[1.125rem]" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-bold text-ink-900">{copy.sidebar.privacyTitle}</p>
          <p className="mt-1.5 text-xs leading-5 text-ink-500">{copy.sidebar.privacyBody}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[4.5rem] max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-7 lg:justify-end lg:px-10">
            <BrandMark className="lg:hidden" />
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLanguage}
                aria-label={copy.topbar.switchLanguage}
              >
                <Languages className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{copy.languageName}</span>
              </Button>
              <Button variant="ghost" size="icon" aria-label={copy.topbar.notifications}>
                <span className="relative">
                  <Bell className="size-5" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-white bg-health-500" />
                </span>
              </Button>
              <LogoutButton />
              <Avatar className="ml-1" name={patient.name} size="sm" />
            </div>
          </div>
        </header>

        {children}
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-ink-100 bg-white/95 px-2 py-1.5 shadow-lift backdrop-blur-xl lg:hidden"
        aria-label={copy.navigationLabel}
      >
        <div className="grid grid-cols-4 items-center">
          {mobilePrimaryItems.map(({ href, icon: Icon, id }) => (
            <a
              key={id}
              href={href}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.65rem] font-semibold transition',
                id === 'dashboard' ? 'bg-health-50 text-health-800' : 'text-ink-500',
              )}
              aria-current={id === 'dashboard' ? 'page' : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="max-w-full truncate">{copy.navShort[id]}</span>
            </a>
          ))}
          <button
            type="button"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.65rem] font-semibold text-ink-500 transition hover:bg-health-50 hover:text-health-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100"
            onClick={() => setMoreOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>{copy.nav.more}</span>
          </button>
        </div>
      </nav>

      <Modal
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={copy.topbar.allSections}
        description={copy.topbar.chooseSection}
      >
        <nav className="grid gap-1" aria-label={copy.navigationLabel}>
          <NavigationItems copy={copy} onNavigate={() => setMoreOpen(false)} />
        </nav>
      </Modal>
    </div>
  );
}
