import { apiClient } from '../../../services/apiClient.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { Button, Card } from '../../../components/ui/index.js';
const load = () => apiClient.get('/api/patients/access-logs');
export function AccessLogs() {
  const { data, error, isLoading, reload } = useAsyncResource(load);
  return <Card id="access-logs" className="mt-6 p-5">
    <h2 className="text-xl font-bold">Who accessed my records</h2>
    <p>Latest 200 authorized provider accesses. Download events mean access was authorized, not that the transfer completed.</p>
    <Button disabled={isLoading} onClick={reload}>Refresh access log</Button>
    {isLoading && <p role="status">Loading?</p>}
    {error && <p role="alert">{error.message}</p>}
    {!isLoading && !error && data?.logs.length === 0 && <p>No provider access events recorded.</p>}
    {data?.logs.map(log => <p key={log.id} className="mt-3">
      {new Date(log.created_at).toLocaleString()} ? {log.provider_name || 'Deleted account'} ({log.role}) ? {log.action}
    </p>)}
  </Card>;
}
