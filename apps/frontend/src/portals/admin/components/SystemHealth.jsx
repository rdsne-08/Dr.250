import { Card } from '../../../components/ui/index.js';

export function SystemHealth({ copy, services }) {
  return (
    <section aria-labelledby="system-health-title">
      <Card className="p-5 sm:p-6">
        <h2 id="system-health-title" className="text-xl font-bold">{copy.health.title}</h2>
        <p className="mt-2 text-sm text-ink-500">{copy.health.description}</p>
        <dl className="mt-4 space-y-2">
          <div><dt className="inline font-semibold">{copy.health.services.database}: </dt><dd className="inline">{services.database === 'available' ? copy.health.available : copy.health.unavailable}</dd></div>
          <div><dt className="inline font-semibold">{copy.health.services.authentication}: </dt><dd className="inline">{copy.health.unavailable}</dd></div>
        </dl>
      </Card>
    </section>
  );
}
