import { LockKeyhole, Mail, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthPageLayout } from '../../components/auth/AuthPageLayout.jsx';
import { authCopy } from '../../components/auth/authCopy.js';
import { RoleSelector } from '../../components/auth/RoleSelector.jsx';
import { Badge, Button, Input, Notification } from '../../components/ui/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { AUTH_ROLES, AuthServiceError, ROLE_HOME } from '../../services/authService.js';

export function RegisterPage() {
  const { language, toggleLanguage } = useLanguage();
  const { clearError, error, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const copy = authCopy[language];
  const [form, setForm] = useState({
    confirmPassword: '',
    confirmed: false,
    email: '',
    licenseNumber: '',
    name: '',
    password: '',
    role: AUTH_ROLES.PATIENT,
    specialization: '',
  });
  const [clientError, setClientError] = useState(null);
  const [success, setSuccess] = useState(false);

  function updateField(field, value) {
    clearError();
    setClientError(null);
    setSuccess(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccess(false);

    if (!form.confirmed) {
      setClientError(new AuthServiceError('', 'CONFIRMATION_REQUIRED'));
      return;
    }

    try {
      const user = await register({ ...form, remember: true });
      setSuccess(true);
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch {
      // AuthContext exposes the normalized service error for the notification below.
    }
  }

  const activeError = clientError ?? error;
  const errorMessage = activeError
    ? (activeError.code === 'REGISTRATION_REJECTED'
      ? activeError.message
      : copy.errors[activeError.code] ?? activeError.message ?? copy.errors.AUTH_ERROR)
    : null;

  return (
    <AuthPageLayout copy={copy} modeCopy={copy.register} onToggleLanguage={toggleLanguage}>
      <div>
        <Badge>
          <UserRoundPlus className="size-3.5" aria-hidden="true" />
          {copy.register.eyebrow}
        </Badge>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-[-0.045em] text-ink-950 sm:text-4xl">
          {copy.register.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">{copy.register.description}</p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        {errorMessage ? (
          <Notification
            variant="error"
            title={copy.errors.title}
            message={errorMessage}
            dismissLabel={copy.shared.dismiss}
            onDismiss={() => {
              clearError();
              setClientError(null);
            }}
          />
        ) : null}
        {success ? (
          <Notification
            variant="success"
            title={copy.register.successTitle}
            message={copy.register.successMessage}
          />
        ) : null}

        <RoleSelector
          copy={copy.roles}
          label={copy.shared.role}
          value={form.role}
          onChange={(role) => updateField('role', role)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <UserRound className="pointer-events-none absolute bottom-4 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              autoComplete="name"
              required
              label={copy.register.name}
              placeholder={copy.register.namePlaceholder}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
          </div>
          <div className="relative sm:col-span-2">
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
          {form.role === AUTH_ROLES.DOCTOR ? (
            <Input
              required
              label={copy.register.specialization ?? authCopy.en.register.specialization}
              placeholder={copy.register.specializationPlaceholder ?? authCopy.en.register.specializationPlaceholder}
              value={form.specialization}
              onChange={(event) => updateField('specialization', event.target.value)}
            />
          ) : null}
          {form.role === AUTH_ROLES.DOCTOR ? (
            <Input
              required
              inputMode="numeric"
              pattern="[0-9]{5,12}"
              maxLength={12}
              label={copy.register.licenseNumber ?? authCopy.en.register.licenseNumber}
              placeholder={copy.register.licenseNumberPlaceholder ?? authCopy.en.register.licenseNumberPlaceholder}
              value={form.licenseNumber}
              onChange={(event) => updateField('licenseNumber', event.target.value)}
            />
          ) : null}
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute bottom-4 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              label={copy.shared.password}
              placeholder={copy.shared.passwordPlaceholder}
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute bottom-4 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              label={copy.register.confirmPassword}
              placeholder={copy.register.confirmPlaceholder}
              value={form.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-canvas p-3.5 text-sm font-semibold leading-5 text-ink-600">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-health-600"
            checked={form.confirmed}
            onChange={(event) => updateField('confirmed', event.target.checked)}
          />
          <span>{copy.register.confirmation}</span>
        </label>

        <Button className="w-full" type="submit" loading={isLoading}>
          {!isLoading ? <ShieldCheck className="size-4" aria-hidden="true" /> : null}
          {copy.register.submit}
        </Button>
      </form>

      <div className="mt-6 border-t border-ink-100 pt-5 text-center">
        <p className="text-sm text-ink-500">
          {copy.register.existingUser}{' '}
          <Link className="font-bold text-health-700 hover:text-health-800" to="/login">
            {copy.register.switchAction}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
