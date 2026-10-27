import { useState } from 'react';
import { Button, Card, Modal } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { patientService } from '../../../services/patientService.js';

function bookingWindowOpen(timezone) {
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: timezone,
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  return local >= '09:00' && local < '12:00';
}

export function FindDoctor({ patient, onBooked }) {
  const { data, error: loadError, isLoading, reload } = useAsyncResource(patientService.discoverDoctors);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  async function book() {
    if (!selected || booking) return;
    setBooking(true); setError('');
    try {
      const appointment = await patientService.bookAppointment(selected.id, selected.local_date);
      setSuccess({ appointment, doctor: selected }); setSelected(null);
      await Promise.all([reload(), onBooked()]);
    } catch (failure) { setError(failure.message || 'Could not book this appointment.'); await reload(); }
    finally { setBooking(false); }
  }
  return <Card id="find-doctor" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Chamber visits</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-950">Find a Doctor</h2></div>
      <Button size="sm" variant="outline" onClick={reload} disabled={isLoading}>Refresh doctors</Button>
    </div>
    <p className="mt-2 text-sm text-ink-500">Same-day booking is open from 9:00 AM to noon in each doctor’s practice timezone.</p>
    {!patient.country_code && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      Add your country in <a className="font-bold underline" href="#patient-country">Profile settings</a> to find eligible doctors.</p>}
    {isLoading && <p className="mt-5 text-ink-500" role="status">Loading eligible doctors…</p>}
    {loadError && <p className="mt-5 text-red-700" role="alert">{loadError.message}
      <Button className="ml-2" size="sm" variant="outline" onClick={reload}>Retry</Button></p>}
    {error && <p className="mt-5 text-red-700" role="alert">{error}</p>}
    {success && <p className="mt-5 rounded-2xl bg-health-50 p-4 text-health-800" role="status">
      Booking confirmed: queue #{success.appointment.queue_position} with {success.doctor.full_name} on {success.appointment.local_date}.
      Your appointment appears below.</p>}
    {data && patient.country_code && data.doctors.length === 0 && <p className="mt-5 text-ink-500">
      No verified doctors are available today in your country. Check again later.</p>}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {(data?.doctors ?? []).map(doctor => {
        const open = bookingWindowOpen(doctor.practice_timezone);
        const full = doctor.remaining_capacity === 0;
        return <div key={doctor.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <span className="rounded-full bg-health-50 px-3 py-1 text-xs font-bold text-health-800">Available Today</span>
          <h3 className="mt-3 text-lg font-bold text-ink-950">{doctor.full_name}</h3>
          <p className="text-health-700">{doctor.specialization}</p>
          <p className="mt-2 text-sm text-ink-600">{doctor.qualifications} · {doctor.years_experience} years of experience</p>
          <p className="mt-3 text-sm text-ink-600">{doctor.chamber_name}, {doctor.chamber_address}, {doctor.city}, {doctor.practice_country}</p>
          <p className="mt-2 text-sm text-ink-600">Today {doctor.consultation_start}–{doctor.consultation_end} ({doctor.practice_timezone})</p>
          <p className="mt-2 text-sm font-semibold text-ink-900">{doctor.consultation_fee} {doctor.consultation_currency}</p>
          <p className="mt-2 text-sm font-semibold text-health-800">{doctor.remaining_capacity} of {doctor.max_patients} places remaining</p>
          {!open && <p className="mt-2 text-sm text-amber-800">Booking opens 9:00 AM–12:00 PM chamber local time.</p>}
          {full && <p className="mt-2 text-sm text-amber-800">Today’s capacity is full.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected({ ...doctor, profileOnly: true })}>View Profile</Button>
            <Button size="sm" disabled={!open || full} onClick={() => setSelected(doctor)}>Book Appointment</Button>
          </div>
        </div>;
      })}
    </div>
    <Modal isOpen={Boolean(selected)} onClose={() => { if (!booking) setSelected(null); }}
      title={selected?.profileOnly ? 'Doctor profile' : 'Confirm booking'}>
      {selected && <div className="space-y-3 text-sm text-ink-700">
        <p className="text-lg font-bold text-ink-950">{selected.full_name} · {selected.specialization}</p>
        <p>{selected.qualifications} · {selected.years_experience} years of experience</p>
        <p>{selected.biography}</p>
        <p><strong>Chamber:</strong> {selected.chamber_name}, {selected.chamber_address}, {selected.city}, {selected.practice_country}</p>
        <p><strong>Date:</strong> {selected.local_date}</p>
        <p><strong>Consultation hours:</strong> {selected.consultation_start}–{selected.consultation_end}</p>
        <p><strong>Fee:</strong> {selected.consultation_fee} {selected.consultation_currency}</p>
        {!selected.profileOnly && <><p>Booking assigns a queue position, not a guaranteed consultation time.</p>
          <p>Booking alone does not grant access to your medical records.</p></>}
        <div className="flex flex-wrap gap-2 pt-3">
          {!selected.profileOnly && <Button loading={booking} onClick={book}>Confirm Booking</Button>}
          <Button variant="secondary" disabled={booking} onClick={() => setSelected(null)}>Cancel</Button>
        </div>
      </div>}
    </Modal>
  </Card>;
}
