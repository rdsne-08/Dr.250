import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { Button, Card } from '../../../components/ui/index.js';
import { patientService } from '../../../services/patientService.js';

const labels = {
  en: {
    title: 'Doctor access', description: 'Choose a verified doctor and grant access to your records. You can revoke it at any time.',
    choose: 'Choose a verified doctor', grant: 'Grant access for 30 days', revoke: 'Revoke access',
    loading: 'Loading doctors and connections…', empty: 'No verified doctors are available.',
    none: 'No active doctor connections.', error: 'Could not load doctor connections.',
    granted: 'Doctor access granted.', revoked: 'Doctor access revoked.',
  },
  bn: {
    title: 'ডাক্তারের প্রবেশাধিকার', description: 'যাচাইকৃত ডাক্তার নির্বাচন করে নথিতে প্রবেশাধিকার দিন। যেকোনো সময় বাতিল করতে পারবেন।',
    choose: 'যাচাইকৃত ডাক্তার নির্বাচন করুন', grant: '৩০ দিনের জন্য অনুমতি দিন', revoke: 'প্রবেশাধিকার বাতিল করুন',
    loading: 'ডাক্তার ও সংযোগ লোড হচ্ছে…', empty: 'কোনো যাচাইকৃত ডাক্তার নেই।',
    none: 'সক্রিয় ডাক্তার সংযোগ নেই।', error: 'ডাক্তার সংযোগ লোড করা যায়নি।',
    granted: 'ডাক্তারকে প্রবেশাধিকার দেওয়া হয়েছে।', revoked: 'প্রবেশাধিকার বাতিল হয়েছে।',
  },
};

export function DoctorAccessCard({ language = 'en', onChanged }) {
  const text = labels[language] ?? labels.en;
  const [doctors, setDoctors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([patientService.getVerifiedDoctors(), patientService.getSessions()])
      .then(([available, current]) => {
        if (active) { setDoctors(available); setSessions(current); setLoading(false); }
      })
      .catch(() => { if (active) { setError(text.error); setLoading(false); } });
    return () => { active = false; };
  }, [text.error]);

  const current = sessions.filter(session => session.status === 'ACTIVE' && !session.revoked_at
    && new Date(session.expires_at) > new Date());
  const availableDoctors = doctors.filter(doctor => !current.some(session => session.doctor_id === doctor.id));

  async function grant() {
    if (!doctorId) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await patientService.createDoctorAccess(doctorId);
      setSessions(await patientService.getSessions());
      setDoctorId(''); setSuccess(text.granted); onChanged?.();
    } catch { setError(text.error); }
    finally { setBusy(false); }
  }

  async function revoke(id) {
    setBusy(true); setError(''); setSuccess('');
    try {
      await patientService.revokeDoctorAccess(id);
      setSessions(await patientService.getSessions());
      setSuccess(text.revoked); onChanged?.();
    } catch { setError(text.error); }
    finally { setBusy(false); }
  }

  return <Card className="p-5 sm:p-7">
    <div className="flex items-start gap-3"><ShieldCheck className="size-7 text-health-700" aria-hidden="true" />
      <div><h2 className="text-2xl font-bold">{text.title}</h2><p className="mt-2 text-sm text-ink-500">{text.description}</p></div>
    </div>
    {loading ? <p className="mt-5" role="status">{text.loading}</p> : <>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {success && <p className="mt-4 text-health-700" role="status">{success}</p>}
      {availableDoctors.length ? <div className="mt-5 space-y-3">
        <label className="block font-semibold" htmlFor="access-doctor">{text.choose}</label>
        <select id="access-doctor" className="w-full rounded-xl border border-ink-200 bg-white p-3"
          value={doctorId} onChange={event => setDoctorId(event.target.value)}>
          <option value="">{text.choose}</option>
          {availableDoctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.full_name} · {doctor.specialization}</option>)}
        </select>
        <Button disabled={!doctorId || busy} onClick={grant}>{text.grant}</Button>
      </div> : <p className="mt-5 text-sm text-ink-500">{doctors.length ? text.none : text.empty}</p>}
      <h3 className="mt-6 border-t pt-4 font-bold">{text.title}</h3>
      {current.length ? <ul className="mt-3 space-y-2">{current.map(session => <li key={session.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-3">
        <span>{session.doctor_name} · {new Date(session.expires_at).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => revoke(session.id)}>{text.revoke}</Button>
      </li>)}</ul> : <p className="mt-2 text-sm text-ink-500">{text.none}</p>}
    </>}
  </Card>;
}
