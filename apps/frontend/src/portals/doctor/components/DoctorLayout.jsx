import {
  Bell,
  CalendarDays,
  ClipboardPlus,
  FileHeart,
  Languages,
  LayoutDashboard,
  MapPin,
  Menu,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';

import { BrandMark } from '../../../components/layout/BrandMark.jsx';
import { LogoutButton } from '../../../components/auth/LogoutButton.jsx';
import { Avatar, Button, Modal } from '../../../components/ui/index.js';
import { cn } from '../../../lib/classNames.js';

const navigation = [
  { id: 'overview', href: '#doctor-overview', icon: LayoutDashboard },
  { id: 'patients', href: '#patient-management', icon: UsersRound },
  { id: 'consultations', href: '#consultation-workspace', icon: CalendarDays },
  { id: 'prescriptions', href: '#prescription-draft', icon: ClipboardPlus },
  { id: 'reports', href: '#patient-management', icon: FileHeart },
  { id: 'profile', href: '#doctor-profile', icon: UserRound },
];

function NavigationItems({ compact = false, copy, onNavigate }) {
  return navigation.map(({ href, icon: Icon, id }) => (
    <a
      key={id}
      href={href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100',
        compact ? 'flex-col gap-1 px-1 py-2 text-[0.65rem]' : 'gap-3 px-4 py-3 text-sm',
        id === 'overview'
          ? 'bg-health-50 text-health-800'
          : 'text-ink-500 hover:bg-health-50 hover:text-health-800',
      )}
      aria-current={id === 'overview' ? 'page' : undefined}
    >
      <Icon className="size-5 shrink-0" strokeWidth={id === 'overview' ? 2.4 : 2} aria-hidden="true" />
      <span>{compact ? copy.navShort[id] : copy.nav[id]}</span>
    </a>
  ));
}

export function DoctorLayout({ children, copy, doctor, onToggleLanguage }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileItems = navigation.filter(({ id }) =>
    ['overview', 'patients', 'consultations', 'profile'].includes(id),
  );

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-ink-100 bg-white px-5 py-6 lg:sticky lg:top-0 lg:flex">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <span className="rounded-full bg-health-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-health-700">
            {copy.sidebar.portal}
          </span>
        </div>

        <div className="mt-8 rounded-3xl border border-ink-100 bg-gradient-to-br from-white to-health-50/70 p-3.5">
          <div className="flex items-center gap-3">
            <Avatar name={doctor.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{doctor.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-500">{doctor.specialty}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-health-100 pt-3 text-[0.68rem] font-semibold text-ink-500">
            <span>{copy.sidebar.doctorId}</span>
            <span className="text-ink-700">{doctor.id}</span>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-1" aria-label={copy.navigationLabel}>
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
          <div className="mx-auto flex min-h-[4.5rem] max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <BrandMark className="lg:hidden" />
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-ink-800">{copy.topbar.date}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                <MapPin className="size-3" aria-hidden="true" />
                {copy.topbar.location}
              </p>
            </div>
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
              <Avatar className="ml-1" name={doctor.name} size="sm" />
            </div>
          </div>
        </header>

        {children}
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-ink-100 bg-white/95 px-2 py-1.5 shadow-lift backdrop-blur-xl lg:hidden"
        aria-label={copy.navigationLabel}
      >
        <div className="grid grid-cols-5 items-center">
          {mobileItems.map(({ href, icon: Icon, id }) => (
            <a
              key={id}
              href={href}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.65rem] font-semibold transition',
                id === 'overview' ? 'bg-health-50 text-health-800' : 'text-ink-500',
              )}
              aria-current={id === 'overview' ? 'page' : undefined}
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
