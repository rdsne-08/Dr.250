import { HeartPulse, Stethoscope } from 'lucide-react';

import { cn } from '../../lib/classNames.js';
import { AUTH_ROLES } from '../../services/authService.js';

const roleIcons = {
  [AUTH_ROLES.PATIENT]: HeartPulse,
  [AUTH_ROLES.DOCTOR]: Stethoscope,
};

export function RoleSelector({ copy, label, name = 'role', onChange, value }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-800">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {Object.values(AUTH_ROLES).map((role) => {
          const Icon = roleIcons[role];
          const selected = value === role;

          return (
            <label
              key={role}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition duration-200',
                'focus-within:ring-4 focus-within:ring-health-100',
                selected
                  ? 'border-health-400 bg-health-50 shadow-card'
                  : 'border-ink-100 bg-white hover:border-health-200 hover:bg-canvas',
              )}
            >
              <input
                className="sr-only"
                type="radio"
                name={name}
                value={role}
                checked={selected}
                onChange={() => onChange(role)}
              />
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', selected ? 'bg-health-600 text-white' : 'bg-health-50 text-health-700')}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">{copy[role].title}</span>
                <span className="mt-0.5 block text-[0.68rem] leading-4 text-ink-500">{copy[role].description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
