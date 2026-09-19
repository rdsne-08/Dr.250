import { ArrowRight, Building2, CheckCircle2, Clock3, Stethoscope, UsersRound } from 'lucide-react';

import { Avatar, Badge, Button, Card } from '../../../components/ui/index.js';

const groupIcons = {
  patient: UsersRound,
  doctor: Stethoscope,
  laboratory: Building2,
};

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

function UserGroup({ copy, group, id, items }) {
  const Icon = groupIcons[group];

  return (
    <Card id={id} className="scroll-mt-24 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-health-50 text-health-700">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-ink-900">{copy.users.groups[group]}</h3>
            <p className="mt-0.5 text-[0.68rem] font-semibold text-ink-400">
              {format(copy.users.userCount, { count: items.length })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-ink-100 p-3.5 transition duration-200 hover:border-health-200 hover:bg-health-50/40">
            <div className="flex items-start gap-3">
              <Avatar className={group === 'laboratory' ? 'rounded-2xl bg-medical-100 text-medical-800' : ''} name={item.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-ink-900">{item.name}</h4>
                    <p className="mt-0.5 truncate text-[0.68rem] text-ink-500">{item.detail}</p>
                  </div>
                  <Badge className="shrink-0 px-2.5" variant={item.verification === 'verified' ? 'health' : 'warning'}>
                    {item.verification === 'verified' ? (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-3" aria-hidden="true" />
                    )}
                    {copy.users.verification[item.verification]}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-2.5 text-[0.68rem] font-semibold">
                  <span className="text-ink-400">{item.id}</span>
                  <span className={item.status === 'active' ? 'text-health-700' : 'text-amber-700'}>
                    {copy.users.roles[item.role]} · {copy.users.statuses[item.status]}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Button className="mt-4" variant="ghost" size="sm">
        {copy.users.viewAll}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}

export function UserManagement({ copy, doctors, labs, users }) {
  return (
    <section id="user-management" className="scroll-mt-24" aria-labelledby="user-management-title">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
            {copy.users.eyebrow}
          </p>
          <h2 id="user-management-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
            {copy.users.title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink-500">{copy.users.description}</p>
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
        <UserGroup copy={copy} group="patient" items={users} />
        <UserGroup copy={copy} group="doctor" id="doctor-users" items={doctors} />
        <UserGroup copy={copy} group="laboratory" id="laboratory-users" items={labs} />
      </div>
    </section>
  );
}
