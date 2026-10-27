import { useState } from 'react';
import { Button, Card } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { patientService } from '../../../services/patientService.js';

export function PatientCountry({ patient, onSaved }) {
  const { data: countries, error: loadError, isLoading, reload } = useAsyncResource(patientService.getCountries);
  const [country, setCountry] = useState(patient.country_code ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      await patientService.updateCountry(country);
      setMessage('Country saved. Doctor results will use your registered country.');
      await onSaved();
    } catch (failure) { setError(failure.message || 'Could not save your country.'); }
    finally { setSaving(false); }
  }
  return <Card id="patient-country" className="scroll-mt-24 p-5 sm:p-7">
    <h2 className="text-xl font-bold text-ink-950">Profile settings</h2>
    <p className="mt-2 text-sm text-ink-500">Your registered country determines which chamber appointments you can book.</p>
    {isLoading && <p className="mt-4 text-sm text-ink-500" role="status">Loading countries…</p>}
    {loadError && <p className="mt-4 text-sm text-red-700" role="alert">Could not load countries.
      <Button className="ml-2" size="sm" variant="outline" onClick={reload}>Retry</Button></p>}
    {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    {message && <p className="mt-4 text-sm text-health-800" role="status">{message}</p>}
    <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={save}>
      <label className="min-w-52 flex-1 text-sm font-semibold text-ink-800">Country
        <select className="mt-2 min-h-12 w-full rounded-2xl border border-ink-100 bg-white px-4"
          required value={country} onChange={event => setCountry(event.target.value)} disabled={!countries || saving}>
          <option value="">Choose your country</option>
          {(countries ?? []).map(item => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
        </select>
      </label>
      <Button type="submit" loading={saving} disabled={!countries || country === patient.country_code}>Save country</Button>
    </form>
  </Card>;
}
