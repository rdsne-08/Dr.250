import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ShieldCheck } from 'lucide-react';

import { Button, Card } from '../../../components/ui/index.js';
import { patientService } from '../../../services/patientService.js';

const labels = {
  en: {
    choose: 'Choose a verified doctor', confirm: 'Confirm doctor', generate: 'Generate PIN and QR',
    confirmed: 'Confirmed doctor', pin: 'Temporary PIN', expires: 'Credential expires',
    share: 'Show this PIN or QR only to the selected doctor. The QR contains only the PIN.',
    sessions: 'Access sessions', pending: 'Waiting for doctor', active: 'Active', revoke: 'Revoke',
    empty: 'No verified doctors are available.', loadError: 'Could not load doctors or sessions.',
    createError: 'Could not create access. Please try again.', revokeError: 'Could not revoke access.',
  },
  bn: {
    choose: 'যাচাইকৃত ডাক্তার নির্বাচন করুন', confirm: 'ডাক্তার নিশ্চিত করুন', generate: 'পিন ও QR তৈরি করুন',
    confirmed: 'নিশ্চিত ডাক্তার', pin: 'অস্থায়ী পিন', expires: 'মেয়াদ শেষ হবে',
    share: 'শুধু নির্বাচিত ডাক্তারকে এই পিন বা QR দেখান। QR-এ শুধু পিন আছে।',
    sessions: 'অ্যাক্সেস সেশন', pending: 'ডাক্তারের অপেক্ষায়', active: 'সক্রিয়', revoke: 'বাতিল করুন',
    empty: 'কোনো যাচাইকৃত ডাক্তার নেই।', loadError: 'ডাক্তার বা সেশন লোড করা যায়নি।',
    createError: 'অ্যাক্সেস তৈরি করা যায়নি। আবার চেষ্টা করুন।', revokeError: 'অ্যাক্সেস বাতিল করা যায়নি।',
  },
};

export function DoctorAccessCard({ copy, language = 'en' }) {
  const text = labels[language] ?? labels.en;
  const [doctors, setDoctors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [confirmedId, setConfirmedId] = useState('');
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([patientService.getVerifiedDoctors(), patientService.getSessions()])
      .then(([available, current]) => {
        if (live) { setDoctors(available); setSessions(current); }
      })
      .catch(() => { if (live) setError(text.loadError); });
    return () => { live = false; };
  }, [text.loadError]);

  useEffect(() => {
    if (!issued?.expires_at) return undefined;
    const remaining = Math.max(0, new Date(issued.expires_at).getTime() - Date.now());
    const timer = window.setTimeout(() => setIssued(null), remaining);
    return () => window.clearTimeout(timer);
  }, [issued]);

  const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);
  const currentSessions = sessions.filter((session) => !session.revoked_at
    && new Date(session.expires_at) > new Date());

  async function generate() {
    if (!confirmedId || confirmedId !== doctorId) return;
    setBusy(true); setError(''); setIssued(null);
    try {
      const session = await patientService.createDoctorAccess(confirmedId);
      setIssued(session);
      patientService.getSessions().then(setSessions).catch(() => setError(text.loadError));
    } catch { setError(text.createError); }
    finally { setBusy(false); }
  }

  async function revoke(sessionId) {
    setBusy(true); setError('');
    try {
      await patientService.revokeDoctorAccess(sessionId);
      setSessions((current) => current.map((session) => session.id === sessionId
        ? { ...session, revoked_at: new Date().toISOString() } : session));
      if (issued?.id === sessionId) setIssued(null);
    } catch { setError(text.revokeError); }
    finally { setBusy(false); }
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <QrCode className="mt-1 size-7 text-health-700" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-health-700">{copy.doctorAccess.eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-ink-950">{copy.doctorAccess.title}</h2>
          <p className="mt-2 text-sm text-ink-500">{copy.doctorAccess.description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="block text-sm font-semibold text-ink-800" htmlFor="access-doctor">{text.choose}</label>
        <select id="access-doctor" className="w-full rounded-xl border border-ink-200 bg-white p-3"
          value={doctorId} onChange={(event) => {
            setDoctorId(event.target.value); setConfirmedId(''); setIssued(null);
          }}>
          <option value="">{text.choose}</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>
            {doctor.full_name} — {doctor.specialization}
          </option>)}
        </select>
        {!doctors.length && <p className="text-sm text-ink-500">{text.empty}</p>}
        {selectedDoctor && confirmedId !== doctorId && (
          <Button type="button" variant="outline" onClick={() => setConfirmedId(doctorId)}>
            {text.confirm}: {selectedDoctor.full_name}
          </Button>
        )}
        {selectedDoctor && confirmedId === doctorId && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-health-700">{text.confirmed}: {selectedDoctor.full_name}</p>
            <Button type="button" onClick={generate} disabled={busy}>{text.generate}</Button>
          </div>
        )}
      </div>

      {issued?.access_token && (
        <div className="mt-6 rounded-2xl border border-health-200 bg-health-50 p-5">
          <p className="text-sm font-bold text-ink-900">{text.pin}</p>
          <code className="mt-2 block break-all rounded-lg bg-white p-3 text-base font-bold tracking-wider text-ink-900"
            aria-label={text.pin}>{issued.access_token}</code>
          <div className="mt-4 inline-block rounded-xl bg-white p-3">
            <QRCodeSVG value={issued.access_token} size={176} title={text.pin} />
          </div>
          <p className="mt-3 text-sm text-ink-700">{text.expires}: {new Date(issued.expires_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-BD')}</p>
          <p className="mt-2 flex gap-2 text-xs text-ink-600"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />{text.share}</p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-6 border-t border-ink-100 pt-4">
        <h3 className="text-sm font-bold text-ink-900">{text.sessions}</h3>
        <ul className="mt-3 space-y-2">
          {currentSessions.map((session) => <li key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas p-3 text-sm">
            <span>{session.doctor_name} · {session.status === 'ACTIVE' ? text.active : text.pending}</span>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => revoke(session.id)}>{text.revoke}</Button>
          </li>)}
        </ul>
      </div>
    </Card>
  );
}
