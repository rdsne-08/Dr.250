import { useState } from 'react';
import { Button, Card, Modal } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { patientService } from '../../../services/patientService.js';

export function MyAppointment({ onChanged }) {
  const { data, error: loadError, isLoading, reload } = useAsyncResource(patientService.getAppointments);
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function cancel() {
    if (!selected || cancelling) return;
    setCancelling(true); setError(''); setSuccess('');
    try {
      await patientService.cancelAppointment(selected.id);
      setSelected(null); setSuccess('Appointment cancelled. Your booking history is retained.');
      await Promise.all([reload(), onChanged()]);
    } catch (failure) { setError(failure.message || 'Could not cancel the appointment.'); }
    finally { setCancelling(false); }
  }
  return <Card id="my-appointment" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-ink-950">My Appointment</h2>
      <Button size="sm" variant="outline" onClick={reload} disabled={isLoading}>Refresh</Button>
    </div>
    {isLoading && <p className="mt-5 text-ink-500" role="status">Loading appointments…</p>}
    {loadError && <p className="mt-5 text-red-700" role="alert">{loadError.message}
      <Button className="ml-2" size="sm" variant="outline" onClick={reload}>Retry</Button></p>}
    {error && <p className="mt-5 text-red-700" role="alert">{error}</p>}
    {success && <p className="mt-5 text-health-800" role="status">{success}</p>}
    {data?.length === 0 && <p className="mt-5 text-ink-500">You have no appointments yet.</p>}
    <ul className="mt-5 divide-y divide-ink-100">{(data ?? []).map(item => <li key={item.id} className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-bold text-ink-950">Queue #{item.queue_position} · {item.doctor_name}</p>
          <p className="mt-1 text-sm text-ink-600">{item.specialization} · {item.local_date}</p>
          <p className="mt-1 text-sm text-ink-600">{item.chamber_name}, {item.chamber_address}, {item.city}</p>
          <p className="mt-1 text-sm text-ink-600">Status: {item.status === 'BOOKED' ? 'Confirmed' : 'Cancelled'}</p></div>
        {item.status === 'BOOKED' && <Button size="sm" variant="outline" onClick={() => setSelected(item)}>Cancel Appointment</Button>}
      </div>
    </li>)}</ul>
    <Modal isOpen={Boolean(selected)} onClose={() => { if (!cancelling) setSelected(null); }}
      title="Cancel appointment" description="This keeps the booking in your history and releases its capacity place.">
      {selected && <><p className="text-sm text-ink-700">Cancel queue #{selected.queue_position} with {selected.doctor_name} on {selected.local_date}?</p>
        <div className="mt-5 flex gap-2"><Button variant="danger" loading={cancelling} onClick={cancel}>Confirm Cancellation</Button>
          <Button variant="secondary" disabled={cancelling} onClick={() => setSelected(null)}>Keep Appointment</Button></div></>}
    </Modal>
  </Card>;
}
