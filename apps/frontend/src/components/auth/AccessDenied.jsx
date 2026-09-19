import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { ROLE_HOME } from '../../services/authService.js';
import { authCopy } from './authCopy.js';
import { DNAAnimation } from '../background/DNAAnimation.jsx';
import { BrandMark } from '../layout/BrandMark.jsx';
import { Badge, Button, Card } from '../ui/index.js';

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function AccessDenied({ requiredRole }) {
  const { language } = useLanguage();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const copy = authCopy[language];

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-12">
      <DNAAnimation className="absolute -right-32 top-0 h-full w-[34rem] opacity-35" />
      <div className="hero-grid absolute inset-0" aria-hidden="true" />
      <Card className="relative z-10 w-full max-w-xl p-7 text-center sm:p-10">
        <BrandMark className="justify-center" />
        <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldAlert className="size-7" aria-hidden="true" />
        </span>
        <Badge className="mt-5" variant="warning">{copy.access.eyebrow}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-ink-950">{copy.access.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">
          {format(copy.access.description, {
            current: copy.roles[user.role].title,
            required: copy.roles[requiredRole].title,
          })}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} to={ROLE_HOME[user.role]}>
            {copy.access.continue}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" loading={isLoggingOut} onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            {copy.access.logout}
          </Button>
        </div>
      </Card>
    </main>
  );
}
