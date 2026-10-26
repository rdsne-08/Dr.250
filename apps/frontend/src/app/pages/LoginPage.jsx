import { KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthPageLayout } from '../../components/auth/AuthPageLayout.jsx';
import { authCopy } from '../../components/auth/authCopy.js';
import { RoleSelector } from '../../components/auth/RoleSelector.jsx';
import { Badge, Button, Input, Notification } from '../../components/ui/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { AUTH_ROLES, ROLE_HOME } from '../../services/authService.js';

export function LoginPage() {
  const { language, toggleLanguage } = useLanguage();
  const { clearError, error, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const copy = authCopy[language];
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: true,
    role: AUTH_ROLES.PATIENT,
  });
  const [success, setSuccess] = useState(false);

  function updateField(field, value) {
    clearError();
    setSuccess(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccess(false);

    try {
      const user = await login(form);
      setSuccess(true);
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch {
      // AuthContext exposes the normalized service error for the notification below.
    }
  }

  const errorMessage = error
    ? copy.errors[error.code] ?? copy.errors.AUTH_ERROR
    : null;

  return (
    <AuthPageLayout copy={copy} modeCopy={copy.login} onToggleLanguage={toggleLanguage}>
      <div>
        <Badge>
          <KeyRound className="size-3.5" aria-hidden="true" />
          {copy.login.eyebrow}
        </Badge>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
          {copy.login.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">{copy.login.description}</p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        {errorMessage ? (
          <Notification
            variant="error"
            title={copy.errors.title}
            message={errorMessage}
            dismissLabel={copy.shared.dismiss}
            onDismiss={clearError}
          />
        ) : null}
        {success ? (
          <Notification
            variant="success"
            title={copy.login.successTitle}
            message={copy.login.successMessage}
          />
        ) : null}

        <RoleSelector
          copy={copy.roles}
          label={copy.shared.role}
          roles={[AUTH_ROLES.PATIENT, AUTH_ROLES.DOCTOR, AUTH_ROLES.ADMIN]}
          value={form.role}
          onChange={(role) => updateField('role', role)}
        />

        <div className="grid gap-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute bottom-4 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              type="email"
              autoComplete="email"
              required
              label={copy.shared.email}
              placeholder={copy.shared.emailPlaceholder}
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute bottom-4 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              label={copy.shared.password}
              placeholder={copy.shared.passwordPlaceholder}
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-canvas p-3.5 text-sm font-semibold text-ink-600">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-health-600"
            checked={form.remember}
            onChange={(event) => updateField('remember', event.target.checked)}
          />
          <span>{copy.login.remember}</span>
        </label>

        <Button className="w-full" type="submit" loading={isLoading}>
          {!isLoading ? <ShieldCheck className="size-4" aria-hidden="true" /> : null}
          {copy.login.submit}
        </Button>

      </form>

      <div className="mt-6 border-t border-ink-100 pt-5 text-center">
        <p className="text-sm text-ink-500">
          {copy.login.newUser}{' '}
          <Link className="font-bold text-health-700 hover:text-health-800" to="/register">
            {copy.login.switchAction}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
