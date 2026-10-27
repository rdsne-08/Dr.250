import { useState } from 'react';
import { Button, Card, Modal } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { doctorService } from '../../../services/doctorService.js';

export function TodayQueue({ onOpen, onComplete }) {
  const { data, error, isLoading, reload } = useAsyncResource(doctorService.getTodayQueue);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  async function open(item) {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await onOpen(item.id); }
    catch (failure) { setActionError(failure.message || 'Could not open consultation.'); }
    finally { setBusy(false); }
  }
  async function act() {
    if (!selected || busy) return;
    setBusy(true); setActionError(''); setMessage('');
    try {
      await doctorService.decideCare(selected.item.id, selected.action);
      if (selected.action === 'accept') await onOpen(selected.item.id);
      if (selected.action === 'complete') onComplete(selected.item.id);
      setMessage(selected.action === 'accept' ? 'Consultation started.'
        : selected.action === 'complete' ? 'Consultation completed and temporary access closed.'
          : 'Care request declined. The appointment remains booked.');
      setSelected(null); await reload();
    } catch (failure) { setActionError(failure.message || 'Could not update this request.'); }
    finally { setBusy(false); }
  }
  return <Card id="today-queue" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Chamber visits</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-950">Today’s Queue</h2></div>
      <Button size="sm" variant="outline" onClick={reload} disabled={isLoading}>Refresh Queue</Button>
    </div>
    {isLoading && <p className="mt-5 text-ink-500" role="status">Loading today’s queue…</p>}
    {error && <p className="mt-5 text-red-700" role="alert">{error.message}
      <Button className="ml-2" size="sm" variant="outline" onClick={reload}>Retry</Button></p>}
    {actionError && <p className="mt-4 text-red-700" role="alert">{actionError}</p>}
    {message && <p className="mt-4 text-health-800" role="status">{message}</p>}
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
          <span><strong>#{item.queue_position}</strong> · {item.patient_name} · {data.local_date}
            <small className="block text-ink-500">Booked {new Date(item.created_at).toLocaleTimeString()} · {item.status === 'BOOKED' ? 'Confirmed' : 'Cancelled'} · Care: {item.consultation_status.toLowerCase()}</small></span>
          <span className="flex flex-wrap gap-2">{item.status === 'BOOKED' && item.consultation_status === 'PENDING' && <>
            <Button size="sm" onClick={() => setSelected({ item, action: 'accept' })}>Accept Patient</Button>
            <Button size="sm" variant="outline" onClick={() => setSelected({ item, action: 'decline' })}>Decline Request</Button></>}
            {item.consultation_status === 'ACTIVE' && <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => open(item)}>Open Consultation</Button>
              <Button size="sm" onClick={() => setSelected({ item, action: 'complete' })}>Complete Consultation</Button></>}
          </span>
        </li>)}</ul>}
    </>}
    <Modal isOpen={Boolean(selected)} onClose={() => { if (!busy) setSelected(null); }}
      title={selected?.action === 'accept' ? 'Accept Patient' : selected?.action === 'decline' ? 'Decline Request' : 'Complete Consultation'}
      description={selected?.action === 'accept' ? 'This opens temporary access to the requesting patient’s history for this visit.'
        : selected?.action === 'complete' ? 'This closes the consultation and its temporary access.'
          : 'The appointment remains available for another care request during consultation hours.'}>
      {selected && <div className="flex gap-2"><Button loading={busy} onClick={act}>Confirm {selected.action}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button></div>}
    </Modal>
  </Card>;
}
