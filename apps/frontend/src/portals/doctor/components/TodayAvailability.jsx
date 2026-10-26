import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { doctorService } from '../../../services/doctorService.js';

export function TodayAvailability({ doctor }) {
  const { data, error: loadError, isLoading, reload } = useAsyncResource(doctorService.getTodayAvailability);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({ available: false, max_patients: '', consultation_start: '', consultation_end: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const current = saved ?? data;
  const profileReady = ['qualifications', 'years_experience', 'biography', 'chamber_name',
    'chamber_address', 'city', 'practice_country', 'practice_timezone',
    'consultation_start', 'consultation_end', 'consultation_fee',
    'consultation_currency'].every(field => doctor[field] !== null && doctor[field] !== undefined
      && doctor[field] !== '');
  const canEnable = doctor.verification_status === 'VERIFIED' && profileReady;

  useEffect(() => {
    if (!data) return;
    setForm({ available: data.available,
      max_patients: data.max_patients ?? '',
      consultation_start: data.consultation_start ?? doctor.consultation_start ?? '',
      consultation_end: data.consultation_end ?? doctor.consultation_end ?? '' });
  }, [data, doctor.consultation_start, doctor.consultation_end]);

  async function save(event) {
    event.preventDefault();
    if (form.available && !canEnable) {
      setError('Verification and a complete professional profile are required.'); return;
    }
    if (form.consultation_start && form.consultation_end
      && form.consultation_start >= form.consultation_end) {
      setError('Consultation end time must be later than start time.'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await doctorService.saveTodayAvailability({
        local_date: current?.local_date,
        available: form.available,
        max_patients: form.max_patients === '' ? null : Number(form.max_patients),
        consultation_start: form.consultation_start || null,
        consultation_end: form.consultation_end || null,
      });
      setSaved(updated); setSuccess('Today’s availability saved.');
    } catch (failure) {
      setError(failure.message || 'Could not save today’s availability.');
      if (failure.status === 409) { setSaved(null); reload(); }
    } finally { setSaving(false); }
  }

  return <Card id="today-availability" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-health-50 text-health-700">
      <CalendarDays className="size-5" /></span>
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Daily settings</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-950">Today’s Availability</h2>
        <p className="mt-2 text-sm text-ink-500">Set availability for the chamber’s local calendar date. This does not create appointments.</p>
      </div></div>
    {isLoading && <p role="status" className="mt-5 text-ink-500">Loading today’s settings…</p>}
    {loadError && <div className="mt-5 text-red-700" role="alert">Could not load today’s availability.
      <Button className="ml-3" size="sm" variant="outline" onClick={reload}>Retry</Button></div>}
    {current && <>
      <div className="mt-6 grid gap-3 rounded-2xl bg-health-50 p-4 text-sm sm:grid-cols-2">
        <p><strong>Chamber date:</strong> {current.local_date ?? 'Set a practice time zone'}
          {current.practice_timezone ? ` (${current.practice_timezone})` : ''}</p>
        <p><strong>Status:</strong> {current.configured ? current.available ? 'Available Today' : 'Unavailable Today' : 'Not configured today'}</p>
        <p><strong>Hours:</strong> {current.configured && current.consultation_start && current.consultation_end
          ? `${current.consultation_start}–${current.consultation_end}` : 'Not set for today'}</p>
        <p><strong>Maximum patients:</strong> {current.configured && current.max_patients !== null
          ? current.max_patients : 'Not set for today'}</p>
      </div>
      {!doctor.practice_timezone && <p className="mt-4 text-sm text-amber-800">Save your chamber’s time zone in Professional Profile first.</p>}
      {!canEnable && <p className="mt-4 text-sm text-amber-800">Only verified doctors with a complete professional profile can enable availability.</p>}
      {success && <p className="mt-4 text-health-800" role="status">{success}</p>}
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={save}>
        <label className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm font-semibold sm:col-span-3">
          <input type="checkbox" className="size-5 accent-health-600" checked={form.available}
            disabled={!canEnable && !form.available}
            onChange={event => setForm(value => ({ ...value, available: event.target.checked }))} />
          {form.available ? 'Available Today' : 'Unavailable Today'}
        </label>
        <Input label="Maximum patients" type="number" min="1" max="100" step="1" required={form.available}
          value={form.max_patients} onChange={event => setForm(value => ({ ...value, max_patients: event.target.value }))} />
        <Input label="Consultation start" type="time" required={form.available} value={form.consultation_start}
          onChange={event => setForm(value => ({ ...value, consultation_start: event.target.value }))} />
        <Input label="Consultation end" type="time" required={form.available} value={form.consultation_end}
          onChange={event => setForm(value => ({ ...value, consultation_end: event.target.value }))} />
        <Button className="sm:col-span-3 sm:w-fit" type="submit" loading={saving} disabled={!doctor.practice_timezone}>
          Save Today’s Availability</Button>
      </form>
    </>}
  </Card>;
}
