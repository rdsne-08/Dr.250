import { Button, Card } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { doctorService } from '../../../services/doctorService.js';

export function TodayQueue() {
  const { data, error, isLoading, reload } = useAsyncResource(doctorService.getTodayQueue);
  return <Card id="today-queue" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Chamber visits</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-950">Today’s Queue</h2></div>
      <Button size="sm" variant="outline" onClick={reload} disabled={isLoading}>Refresh Queue</Button>
    </div>
    {isLoading && <p className="mt-5 text-ink-500" role="status">Loading today’s queue…</p>}
    {error && <p className="mt-5 text-red-700" role="alert">{error.message}
      <Button className="ml-2" size="sm" variant="outline" onClick={reload}>Retry</Button></p>}
    {data && <><div className="mt-5 grid gap-3 rounded-2xl bg-health-50 p-4 text-sm sm:grid-cols-2">
      <p><strong>Chamber date:</strong> {data.local_date ?? 'Set your practice timezone'}</p>
      <p><strong>Availability:</strong> {data.availability?.available ? 'Available Today' : 'Unavailable Today'}</p>
      <p><strong>Daily capacity:</strong> {data.availability?.max_patients ?? 'Not configured'}</p>
      <p><strong>Active bookings:</strong> {data.active_count}</p>
      <p><strong>Remaining places:</strong> {data.remaining_capacity}</p>
      <p><strong>Consultation hours:</strong> {data.availability?.consultation_start && data.availability?.consultation_end
        ? `${data.availability.consultation_start}–${data.availability.consultation_end}` : 'Not configured'}</p>
    </div>
      {data.appointments.length === 0 ? <p className="mt-5 text-ink-500">No appointments in today’s queue.</p> :
        <ul className="mt-5 divide-y divide-ink-100">{data.appointments.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
          <span><strong>#{item.queue_position}</strong> · {item.patient_name}</span>
          <span>{new Date(item.created_at).toLocaleTimeString()} · {item.status === 'BOOKED' ? 'Confirmed' : 'Cancelled'}</span>
        </li>)}</ul>}
    </>}
  </Card>;
}
