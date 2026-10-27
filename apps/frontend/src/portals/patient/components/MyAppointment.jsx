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
  const [requesting, setRequesting] = useState(false);
  async function requestCare() {
    if (!selected || requesting) return;
    setRequesting(true); setError(''); setSuccess('');
    try {
      await patientService.requestCare(selected.id);
      setSelected(null); setSuccess('Care requested. Waiting for Doctor.');
      await reload();
    } catch (failure) { setError(failure.message || 'Could not request care.'); }
    finally { setRequesting(false); }
  }
  function careEligibility(item) {
    if (item.status !== 'BOOKED') return 'This appointment was cancelled.';
    if (item.consultation_status === 'COMPLETED') return 'This visit is complete.';
    if (item.consultation_status === 'ACTIVE') return 'Your consultation is active.';
    if (item.consultation_status === 'PENDING') return 'Waiting for Doctor.';
    if (!item.practice_timezone || !item.consultation_start || !item.consultation_end) return 'Consultation hours are unavailable.';
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: item.practice_timezone,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      hourCycle: 'h23' }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    const date = `${value('year')}-${value('month')}-${value('day')}`;
    const clock = `${value('hour')}:${value('minute')}`;
    if (date !== item.local_date) return 'Request Care is available on the chamber date.';
    if (clock < item.consultation_start || clock >= item.consultation_end) {
      return `Request Care is available ${item.consultation_start}–${item.consultation_end} chamber time.`;
    }
    return '';
  }
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
          <p className="mt-1 text-sm text-ink-600">Booking: {item.status === 'BOOKED' ? 'Confirmed' : 'Cancelled'} · Care: {item.consultation_status === 'NONE' ? 'Awaiting request' : item.consultation_status === 'PENDING' ? 'Waiting for Doctor' : item.consultation_status.toLowerCase()}</p>
          {item.consultation_status === 'COMPLETED' && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-health-800">View completed visit and prescription</summary>
            {(item.visit_prescriptions ?? []).length === 0 ? <p className="mt-2">No prescription was issued.</p> :
              <ul className="mt-2 space-y-2">{item.visit_prescriptions.map(prescription => <li key={prescription.id}>
                <strong>{prescription.medicine}</strong> · {prescription.dosage} · {prescription.duration || 'Duration not recorded'}
                <p>{prescription.instructions}</p></li>)}</ul>}</details>}
          {['NONE', 'DECLINED'].includes(item.consultation_status) && item.status === 'BOOKED' &&
            (careEligibility(item) ? <p className="mt-2 text-sm text-amber-800">{careEligibility(item)}</p> :
              <Button className="mt-2" size="sm" onClick={() => setSelected({ ...item, action: 'request' })}>Request Care</Button>)}
        </div>
        {item.status === 'BOOKED' && !['ACTIVE', 'COMPLETED'].includes(item.consultation_status) &&
          <Button size="sm" variant="outline" onClick={() => setSelected({ ...item, action: 'cancel' })}>Cancel Appointment</Button>}
      </div>
    </li>)}</ul>
    <Modal isOpen={Boolean(selected)} onClose={() => { if (!cancelling && !requesting) setSelected(null); }}
      title={selected?.action === 'request' ? 'Request Care' : 'Cancel appointment'}
      description={selected?.action === 'request'
        ? 'Confirm that you have arrived at the chamber. Accepting your request lets this doctor view your authorized history for this visit.'
        : 'This keeps the booking in your history and releases its capacity place.'}>
      {selected && <><p className="text-sm text-ink-700">Queue #{selected.queue_position} with {selected.doctor_name} on {selected.local_date}.</p>
        <div className="mt-5 flex gap-2">{selected.action === 'request'
          ? <Button loading={requesting} onClick={requestCare}>Confirm Request</Button>
          : <Button variant="danger" loading={cancelling} onClick={cancel}>Confirm Cancellation</Button>}
          <Button variant="secondary" disabled={cancelling || requesting} onClick={() => setSelected(null)}>
            {selected.action === 'request' ? 'Cancel' : 'Keep Appointment'}</Button></div></>}
    </Modal>
  </Card>;
}
