import { useState } from 'react';

import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { LogoutButton } from '../../../components/auth/LogoutButton.jsx';
import { Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { doctorService } from '../../../services/doctorService.js';

const emptyPrescription = { medicine: '', dosage: '', duration: '', instructions: '' };

export function DoctorPortalPage() {
  const { data, error, isLoading, reload } = useAsyncResource(doctorService.getDashboard);
  const [patientId, setPatientId] = useState('');
  const [form, setForm] = useState(emptyPrescription);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  if (isLoading) return <LoadingScreen label="Loading authorized patients…" />;
  if (error || !data) return <ErrorState title="Could not load doctor workspace"
    description={error?.message || 'Please try again.'} actionLabel="Retry" onRetry={reload} />;

  const selected = data.patients.find(patient => patient.id === patientId) ?? data.patients[0];

  async function prescribe(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setSaveError(''); setMessage('');
    try {
      await doctorService.createPrescription({ patientId: selected.id, ...form });
      setForm(emptyPrescription);
      await reload();
      setMessage('Prescription saved. It is available in the patient’s history.');
    } catch (failure) { setSaveError(failure.message || 'Could not save prescription.'); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-canvas p-4 sm:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Doctor workspace</h1>
          <p>{data.doctor.full_name} · {data.doctor.specialization}</p></div>
        <LogoutButton />
      </header>
      {data.doctor.verification_status !== 'VERIFIED' ? <Card className="p-6">
        <h2 className="text-xl font-bold">Verification required</h2>
        <p className="mt-2">Patient records and prescription tools become available after your medical license is verified.</p>
      </Card> : <>
        <Card className="p-6" id="authorized-patients">
          <h2 className="text-xl font-bold">Patients who granted access</h2>
          <Button className="mt-3" variant="outline" onClick={reload}>Refresh connections</Button>
          {data.patients.length === 0 ? <p className="mt-4">No patients have granted you active access.</p> : <>
            <label className="mt-4 block font-semibold" htmlFor="doctor-patient">Select patient</label>
            <select id="doctor-patient" className="mt-2 w-full rounded-xl border p-3"
              value={selected?.id || ''} onChange={event => setPatientId(event.target.value)}>
              {data.patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
            </select>
          </>}
        </Card>
        {selected && <>
          <Card className="p-6" id="patient-records"><h2 className="text-xl font-bold">Medical records · {selected.full_name}</h2>
            {selected.records.length === 0 ? <p className="mt-3">No medical records yet.</p> :
              <ul className="mt-3 divide-y">{selected.records.map(record => <li key={record.id} className="py-3">
                <strong>{record.diagnosis || 'Medical record'}</strong>
                <p>{record.notes || 'No notes.'}</p>
                {record.date && <time className="text-sm text-ink-500" dateTime={record.date}>{new Date(record.date).toLocaleDateString()}</time>}
              </li>)}</ul>}
          </Card>
          <Card className="p-6" id="patient-prescriptions"><h2 className="text-xl font-bold">Prescriptions</h2>
            {selected.prescriptions.length === 0 ? <p className="mt-3">No prescriptions yet.</p> :
              <ul className="mt-3 divide-y">{selected.prescriptions.map(item => <li key={item.id} className="py-3">
                <strong>{item.medicine}</strong> · {item.dosage}
                {item.instructions && <p>{item.instructions}</p>}
              </li>)}</ul>}
          </Card>
          <Card className="p-6" id="create-prescription"><h2 className="text-xl font-bold">Create prescription</h2>
            {message && <p className="mt-3 text-health-700" role="status">{message}</p>}
            {saveError && <p className="mt-3 text-red-700" role="alert">{saveError}</p>}
            <form className="mt-4 grid gap-4" onSubmit={prescribe}>
              {['medicine', 'dosage', 'duration', 'instructions'].map(field => <Input key={field}
                required={field !== 'duration'} label={field[0].toUpperCase() + field.slice(1)}
                value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} />)}
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save prescription'}</Button>
            </form>
          </Card>
        </>}
      </>}
    </div>
  </main>;
}
