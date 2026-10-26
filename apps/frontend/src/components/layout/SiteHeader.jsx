import { Languages, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '../../hooks/useLanguage.js';
import { Button } from '../ui/Button.jsx';
import { BrandMark } from './BrandMark.jsx';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { copy, toggleLanguage } = useLanguage();
  const links = [
    { href: '/#services', label: copy.nav.services },
    { href: '/#how-it-works', label: copy.nav.howItWorks },
    { href: '/#for-everyone', label: copy.nav.everyone },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.75rem] max-w-content items-center justify-between gap-4 px-5 sm:px-8">
        <BrandMark />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-health-50 hover:text-health-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            aria-label={copy.nav.switchLanguage}
          >
            <Languages className="size-4" aria-hidden="true" />
            {copy.languageName}
          </Button>
          <Button as={Link} to="/login" variant="ghost" size="sm">
            {copy.nav.login}
          </Button>
          <Button as={Link} to="/register" size="sm">
            {copy.nav.register}
          </Button>
        </div>

        <Button
          className="sm:hidden"
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.menu}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-navigation"
          className="border-t border-ink-100 bg-white px-5 py-5 sm:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-content flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl px-4 py-3 text-base font-semibold text-ink-700 hover:bg-health-50"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
              <Button variant="secondary" onClick={toggleLanguage} aria-label={copy.nav.switchLanguage}>
                <Languages className="size-4" aria-hidden="true" />
                {copy.languageName}
              </Button>
              <Button as={Link} to="/login" variant="outline" onClick={() => setMenuOpen(false)}>
                {copy.nav.login}
              </Button>
              <Button
                as={Link}
                to="/register"
                className="col-span-2"
                onClick={() => setMenuOpen(false)}
              >
                {copy.nav.register}
              </Button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
