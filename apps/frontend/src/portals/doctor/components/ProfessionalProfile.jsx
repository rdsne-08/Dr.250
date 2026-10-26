import { useEffect, useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';

import { Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { doctorService } from '../../../services/doctorService.js';

const fields = ['full_name', 'specialization', 'qualifications', 'years_experience',
  'biography', 'chamber_name', 'chamber_address', 'city', 'practice_country',
  'practice_timezone', 'consultation_start', 'consultation_end', 'consultation_fee',
  'consultation_currency'];
const asForm = doctor => Object.fromEntries(fields.map(field => [field, doctor[field] ?? '']));
const selectClass = 'min-h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-ink-900 disabled:bg-ink-50 disabled:text-ink-500';

function SelectField({ label, value, choices, disabled, onChange }) {
  return <label className="block text-sm font-semibold text-ink-800">{label}<span className="ml-1 text-health-700">*</span>
    <select className={`mt-2 ${selectClass}`} required disabled={disabled} value={value} onChange={onChange}>
      <option value="">Choose {label.toLowerCase()}</option>
      {choices.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </label>;
}

export function ProfessionalProfile({ doctor, onSaved }) {
  const { data: options, error: optionsError, isLoading: optionsLoading, reload: reloadOptions } =
    useAsyncResource(doctorService.getProfileOptions);
  const [form, setForm] = useState(() => asForm(doctor));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { if (!editing) setForm(asForm(doctor)); }, [doctor, editing]);
  const set = field => event => setForm(current => ({ ...current, [field]: event.target.value }));

  function cancel() { setForm(asForm(doctor)); setEditing(false); setError(''); }
  async function save(event) {
    event.preventDefault();
    if (form.consultation_start >= form.consultation_end) {
      setError('Consultation end time must be later than start time.'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const saved = await doctorService.updateProfile({ ...form,
        years_experience: Number(form.years_experience) });
      setForm(asForm(saved)); setEditing(false);
      setSuccess('Professional profile saved.');
      onSaved();
    } catch (failure) { setError(failure.message || 'Could not save your profile.'); }
    finally { setSaving(false); }
  }

  return <Card id="professional-profile" className="scroll-mt-24 p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Your practice</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-950">Professional Profile</h2>
        <p className="mt-2 text-sm text-ink-500">Keep your chamber details and consultation information current.</p></div>
      {!editing && <Button size="sm" variant="outline" onClick={() => { setEditing(true); setSuccess(''); }}>
        <Pencil className="size-4" />Edit Profile</Button>}
    </div>
    <div className="mt-5 flex flex-wrap gap-3 rounded-2xl bg-health-50 p-4 text-sm">
      <span><strong>Medical license:</strong> {doctor.license_number}</span>
      <span className="flex items-center gap-1"><ShieldCheck className="size-4 text-health-700" />
        <strong>Verification:</strong> {doctor.verification_status}</span>
    </div>
    {!doctor.qualifications && !editing && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      Complete your profile to enable today’s availability after verification.</p>}
    {optionsLoading && <p className="mt-5 text-ink-500" role="status">Loading practice options…</p>}
    {optionsError && <div className="mt-5 text-red-700" role="alert">Could not load country and time zone choices.
      <Button className="ml-3" size="sm" variant="outline" onClick={reloadOptions}>Retry</Button></div>}
    {success && <p className="mt-4 text-health-800" role="status">{success}</p>}
    {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
    <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={save}>
      <Input required label="Full name" maxLength={120} disabled={!editing} value={form.full_name} onChange={set('full_name')} />
      <Input required label="Specialization" maxLength={120} disabled={!editing} value={form.specialization} onChange={set('specialization')} />
      <Input required label="Qualifications" maxLength={500} disabled={!editing} value={form.qualifications} onChange={set('qualifications')} />
      <Input required label="Years of experience" type="number" min="0" step="1" disabled={!editing} value={form.years_experience} onChange={set('years_experience')} />
      <label className="block text-sm font-semibold text-ink-800 sm:col-span-2">Professional biography<span className="ml-1 text-health-700">*</span>
        <textarea className={`${selectClass} mt-2 min-h-28 py-3`} required maxLength={2000} disabled={!editing}
          value={form.biography} onChange={set('biography')} /></label>
      <Input required label="Chamber name" maxLength={160} disabled={!editing} value={form.chamber_name} onChange={set('chamber_name')} />
      <Input required label="Chamber address" maxLength={300} disabled={!editing} value={form.chamber_address} onChange={set('chamber_address')} />
      <Input required label="City" maxLength={120} disabled={!editing} value={form.city} onChange={set('city')} />
      <SelectField label="Practice country" disabled={!editing || !options} value={form.practice_country}
        onChange={event => setForm(current => ({ ...current, practice_country: event.target.value, practice_timezone: '' }))}
        choices={(options?.countries ?? []).map(item => ({ value: item.code, label: `${item.name} (${item.code})` }))} />
      <SelectField label="Chamber time zone" disabled={!editing || !options} value={form.practice_timezone} onChange={set('practice_timezone')}
        choices={(options?.timezonesByCountry?.[form.practice_country] ?? []).map(value => ({ value, label: value }))} />
      <Input required label="Consultation start" type="time" disabled={!editing} value={form.consultation_start} onChange={set('consultation_start')} />
      <Input required label="Consultation end" type="time" disabled={!editing} value={form.consultation_end} onChange={set('consultation_end')} />
      <Input required label="Consultation fee" type="number" min="0" step="0.01" disabled={!editing} value={form.consultation_fee} onChange={set('consultation_fee')} />
      <SelectField label="Fee currency" disabled={!editing || !options} value={form.consultation_currency} onChange={set('consultation_currency')}
        choices={(options?.currencies ?? []).map(value => ({ value, label: value }))} />
      {editing && <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" loading={saving} disabled={!options}>Save Changes</Button>
        <Button variant="secondary" disabled={saving} onClick={cancel}>Cancel</Button>
      </div>}
    </form>
  </Card>;
}
