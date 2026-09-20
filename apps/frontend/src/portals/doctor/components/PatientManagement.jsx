import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRoundSearch,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, Badge, Button, Card, EmptyState, Input } from '../../../components/ui/index.js';
import { cn } from '../../../lib/classNames.js';

const filters = ['all', 'followup', 'new', 'attention'];

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export function PatientManagement({ copy, patients }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id);

  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return patients.filter((patient) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        patient.name.toLocaleLowerCase().includes(normalizedQuery) ||
        patient.id.toLocaleLowerCase().includes(normalizedQuery);
      const matchesFilter =
        activeFilter === 'all' ||
        patient.category === activeFilter ||
        (activeFilter === 'attention' && patient.priority === 'attention');

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, patients, query]);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];

  if (!selectedPatient) {
    return (
      <section id="patient-management" className="scroll-mt-24" aria-labelledby="patients-title">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
          {copy.patients.eyebrow}
        </p>
        <h2 id="patients-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
          {copy.patients.title}
        </h2>
        <EmptyState
          className="mt-6 shadow-card"
          icon={UserRoundSearch}
          title={copy.states.noPatientsTitle}
          description={copy.states.noPatientsBody}
        />
      </section>
    );
  }

  return (
    <section id="patient-management" className="scroll-mt-24" aria-labelledby="patients-title">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">
            {copy.patients.eyebrow}
          </p>
          <h2 id="patients-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950 sm:text-3xl">
            {copy.patients.title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink-500">{copy.patients.description}</p>
      </div>

      <Card className="mt-6 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-ink-100 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute bottom-3.5 left-4 z-10 size-4 text-ink-300" aria-hidden="true" />
            <Input
              className="pl-11"
              label={copy.patients.searchLabel}
              placeholder={copy.patients.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label={copy.patients.searchLabel}>
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  'min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100',
                  activeFilter === filter
                    ? 'border-health-600 bg-health-600 text-white shadow-card'
                    : 'border-ink-100 bg-white text-ink-600 hover:border-health-200 hover:bg-health-50 hover:text-health-800',
                )}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {copy.patients.filters[filter]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(23rem,0.9fr)_minmax(28rem,1.1fr)]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-4 px-1">
              <p className="text-xs font-bold text-ink-500">
                {format(copy.patients.patientCount, { count: visiblePatients.length })}
              </p>
              <UserRoundSearch className="size-4 text-ink-300" aria-hidden="true" />
            </div>

            <div className="grid max-h-[33rem] gap-3 overflow-y-auto pr-1">
              {visiblePatients.map((patient) => {
                const isSelected = patient.id === selectedPatient.id;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    className={cn(
                      'group w-full rounded-3xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-health-100',
                      isSelected
                        ? 'border-health-300 bg-health-50/80 shadow-card'
                        : 'border-ink-100 bg-white hover:border-health-200 hover:bg-canvas',
                    )}
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={patient.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="truncate text-sm font-bold text-ink-950">{patient.name}</h3>
                            <p className="mt-1 text-xs text-ink-500">
                              {format(copy.patients.ageAndSex, { age: patient.age, sex: patient.sex })}
                            </p>
                          </div>
                          {isSelected ? (
                            <Badge className="shrink-0 px-2.5">
                              <Check className="size-3" aria-hidden="true" />
                              {copy.patients.selected}
                            </Badge>
                          ) : (
                            <ChevronRight className="mt-1 size-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-health-600" aria-hidden="true" />
                          )}
                        </div>
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-600">{patient.summary}</p>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100/80 pt-3 text-[0.68rem] font-semibold text-ink-500">
                          <span>{patient.id}</span>
                          <span>{copy.patients.lastVisit}: {patient.lastVisit}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {visiblePatients.length === 0 ? (
                <EmptyState
                  className="min-h-56 shadow-none"
                  icon={Search}
                  title={copy.patients.noResults}
                  description={copy.states.clearSearch}
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-health-100 bg-gradient-to-br from-health-50/80 via-white to-medical-50/60 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="ring-4 ring-white shadow-card" name={selectedPatient.name} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-health-700">
                    {copy.patients.summaryEyebrow}
                  </p>
                  <h3 className="mt-1 truncate text-xl font-bold tracking-[-0.025em] text-ink-950">
                    {selectedPatient.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-500">{selectedPatient.id}</p>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-ink-500">
                <ShieldCheck className="size-4 text-health-600" aria-hidden="true" />
                {copy.patients.protected}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: copy.patients.bloodPressure, value: selectedPatient.vitals.bloodPressure, icon: HeartPulse },
                { label: copy.patients.pulse, value: selectedPatient.vitals.pulse, icon: Activity },
                { label: copy.patients.bloodGroup, value: selectedPatient.vitals.bloodGroup, icon: Droplets },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-white bg-white/80 p-3 shadow-card">
                  <Icon className="size-4 text-health-600" aria-hidden="true" />
                  <p className="mt-3 text-[0.65rem] font-semibold leading-4 text-ink-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-ink-950 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 shadow-card">
              <p className="flex items-center gap-2 text-xs font-bold text-ink-700">
                <Stethoscope className="size-4 text-health-600" aria-hidden="true" />
                {copy.patients.clinicalNotes}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-600">{selectedPatient.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPatient.flags.map((flag, index) => (
                  <Badge key={flag} variant={index === 0 ? 'teal' : 'neutral'}>{flag}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-600">
                <Clock3 className="size-4 text-health-600" aria-hidden="true" />
                {copy.patients.recentHistory}
              </h4>
              <div className="mt-3 space-y-3">
                {selectedPatient.history.map((item) => (
                  <div key={`${item.date}-${item.title}`} className="grid grid-cols-[4.5rem_1fr] gap-3">
                    <p className="pt-0.5 text-xs font-bold text-health-700">{item.date}</p>
                    <div className="border-l border-health-200 pl-3">
                      <p className="text-sm font-bold text-ink-800">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="mt-6" variant="outline" size="sm">
              {copy.patients.openProfile}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
