import { useState } from 'react';
import { Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { patientService } from '../../../services/patientService.js';

const blankProfile = { conditions: '', medical_history: '', allergies: '', current_medications: '', notes: '' };
const blankMeasurement = { measured_on: '', systolic_mmhg: '', diastolic_mmhg: '', pulse_bpm: '', weight_kg: '' };
const profileFields = [
  ['conditions', 'Medical conditions'], ['medical_history', 'Relevant medical history'],
  ['allergies', 'Allergies'], ['current_medications', 'Current medications'], ['notes', 'Health notes'],
];
const measurementFields = [
  ['systolic_mmhg', 'Systolic blood pressure (mmHg)', 40, 300],
  ['diastolic_mmhg', 'Diastolic blood pressure (mmHg)', 20, 200],
  ['pulse_bpm', 'Pulse (beats/min)', 20, 250], ['weight_kg', 'Weight (kg)', 1, 500],
];

export function MyHealthProfile({ onSaved }) {
  const { data, error: loadError, isLoading, reload } = useAsyncResource(patientService.getHealthProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState(blankProfile);
  const [bloodGroup, setBloodGroup] = useState('');
  const [measurement, setMeasurement] = useState(blankMeasurement);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function startProfile() {
    setProfile(Object.fromEntries(profileFields.map(([key]) => [key, data?.profile?.[key] ?? ''])));
    setBloodGroup(data?.blood_group ?? '');
    setError(''); setSuccess(''); setEditingProfile(true);
  }
  function startMeasurement(item = null) {
    setMeasurement(item ? Object.fromEntries(Object.keys(blankMeasurement).map(key => [key, item[key] ?? '']))
      : blankMeasurement);
    setEditingMeasurement(item?.id ?? 'new'); setError(''); setSuccess('');
  }
  async function saveProfile(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      await patientService.saveHealthProfile({ ...profile, blood_group: bloodGroup || null });
      setEditingProfile(false); setSuccess('Patient-reported health profile saved.');
      await Promise.all([reload(), onSaved?.()]);
    } catch (failure) { setError(failure.message || 'Could not save health profile.'); }
    finally { setSaving(false); }
  }
  async function saveMeasurement(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const details = { measured_on: measurement.measured_on,
      ...Object.fromEntries(measurementFields.map(([key]) => [key,
        measurement[key] === '' ? null : Number(measurement[key])])) };
    if ((details.systolic_mmhg === null) !== (details.diastolic_mmhg === null)) {
      setError('Enter both blood pressure values.'); setSaving(false); return;
    }
    if (measurementFields.every(([key]) => details[key] === null)) {
      setError('Enter at least one measurement.'); setSaving(false); return;
    }
    try {
      if (editingMeasurement === 'new') await patientService.addHealthMeasurement(details);
      else await patientService.updateHealthMeasurement(editingMeasurement, details);
      setEditingMeasurement(null); setSuccess('Self-reported measurement saved.'); reload();
    } catch (failure) { setError(failure.message || 'Could not save measurement.'); }
    finally { setSaving(false); }
  }

  return <Card id="my-health-profile" className="scroll-mt-24 p-5 sm:p-7">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Self-reported information</p>
    <h2 className="mt-2 text-2xl font-bold text-ink-950">My Health Profile</h2>
    <p className="mt-2 text-sm text-ink-500">Information you enter here is self-reported and separate from doctor-authored records and prescriptions.</p>
    {isLoading && <p className="mt-4" role="status">Loading health profile…</p>}
    {loadError && <p className="mt-4 text-red-700" role="alert">{loadError.message} <Button size="sm" onClick={reload}>Retry</Button></p>}
    {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
    {success && <p className="mt-4 text-health-800" role="status">{success}</p>}
    {data && <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Health details</h3>
        {!editingProfile && <Button size="sm" variant="outline" onClick={startProfile}>{data.profile ? 'Edit' : 'Add'}</Button>}
      </div>
      {editingProfile ? <form className="mt-4 space-y-4" onSubmit={saveProfile}>
        <label className="block text-sm font-semibold text-ink-800">Blood Group (patient-reported)
          <select className="mt-2 w-full rounded-2xl border border-ink-100 bg-white p-4" value={bloodGroup}
            onChange={event => setBloodGroup(event.target.value)}>
            <option value="">Not recorded</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(value =>
              <option key={value} value={value}>{value.replace('-', '−')}</option>)}
          </select>
        </label>
        {profileFields.map(([key, label]) => <label key={key} className="block text-sm font-semibold text-ink-800">{label}
          <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-ink-100 p-4"
            maxLength={key === 'medical_history' || key === 'notes' ? 5000 : 3000}
            value={profile[key]} onChange={event => setProfile(current => ({ ...current, [key]: event.target.value }))} />
        </label>)}
        <div className="flex gap-2"><Button type="submit" loading={saving}>Save</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => setEditingProfile(false)}>Cancel</Button></div>
      </form> : <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm font-semibold text-ink-700">Blood Group (patient-reported)</dt>
          <dd className="mt-1 text-sm text-ink-500">{data.blood_group?.replace('-', '−') || 'Not recorded'}</dd></div>
        {profileFields.map(([key, label]) =>
        <div key={key}><dt className="text-sm font-semibold text-ink-700">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-500">{data.profile?.[key] || 'Not reported'}</dd></div>)}</dl>}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-100 pt-6">
        <h3 className="text-lg font-bold">Measurements</h3>
        {!editingMeasurement && <Button size="sm" variant="outline" onClick={() => startMeasurement()}>Add</Button>}
      </div>
      {editingMeasurement && <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveMeasurement}>
        <Input required type="date" label="Measurement date" max={new Date().toISOString().slice(0, 10)}
          value={measurement.measured_on} onChange={event => setMeasurement(current => ({ ...current, measured_on: event.target.value }))} />
        {measurementFields.map(([key, label, min, max]) => <Input key={key} type="number" label={label}
          min={min} max={max} step={key === 'weight_kg' ? '0.01' : '1'} value={measurement[key]}
          onChange={event => setMeasurement(current => ({ ...current, [key]: event.target.value }))} />)}
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={saving}>Save</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => setEditingMeasurement(null)}>Cancel</Button></div>
      </form>}
      {data.measurements.length === 0 ? <p className="mt-4 text-sm text-ink-500">No self-reported measurements yet.</p> :
        <ul className="mt-4 divide-y divide-ink-100">{data.measurements.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <span><strong>{item.measured_on}</strong> · {item.systolic_mmhg !== null ? `${item.systolic_mmhg}/${item.diastolic_mmhg} mmHg` : 'BP not reported'}
            {' · '}{item.pulse_bpm !== null ? `${item.pulse_bpm} beats/min` : 'Pulse not reported'}
            {' · '}{item.weight_kg !== null ? `${item.weight_kg} kg` : 'Weight not reported'}</span>
          <Button size="sm" variant="outline" disabled={Boolean(editingMeasurement)} onClick={() => startMeasurement(item)}>Edit</Button>
        </li>)}</ul>}
    </>}
  </Card>;
}
