import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { Button, Card } from '../../../components/ui/index.js';
import { patientService } from '../../../services/patientService.js';

const labels = {
  title: 'Who accessed my records',
  description: 'Recent authorized provider access to your records.',
  refresh: 'Refresh access history', loading: 'Loading access history…',
  error: 'Could not load access history.', empty: 'No provider access recorded.',
  unknownProvider: 'Unknown provider', resource: 'Resource',
};

export function AccessLogs() {
  const { data: logs, error, isLoading, reload } = useAsyncResource(patientService.getAccessLogs);
  return <Card id="access-logs" className="mt-6 scroll-mt-24 p-5" aria-labelledby="access-logs-title">
    <h2 id="access-logs-title" className="text-xl font-bold">{labels.title}</h2>
    <p className="mt-2 text-sm text-ink-500">{labels.description}</p>
    <Button className="mt-4" disabled={isLoading} onClick={reload}>{labels.refresh}</Button>
    {isLoading && <p className="mt-4" role="status">{labels.loading}</p>}
    {!isLoading && error && <p className="mt-4" role="alert">{labels.error}</p>}
    {!isLoading && !error && logs?.length === 0 && <p className="mt-4">{labels.empty}</p>}
    {!isLoading && !error && logs?.length > 0 && <ul className="mt-4 divide-y divide-ink-100">
      {logs.map((log) => {
        const date = log.created_at && new Date(log.created_at);
        const timestamp = date && !Number.isNaN(date.getTime())
          ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
          : null;
        return <li key={log.id} className="py-3">
          <p className="font-semibold">{log.provider_name || labels.unknownProvider}{log.role ? ` (${log.role})` : ''}</p>
          <p>{log.action}</p>
          {log.resource_type && <p className="text-sm text-ink-500">{labels.resource}: {log.resource_type}{log.resource_id ? ` · ${log.resource_id}` : ''}</p>}
          {timestamp && <time className="text-sm text-ink-500" dateTime={date.toISOString()}>{timestamp}</time>}
        </li>;
      })}
    </ul>}
  </Card>;
}
