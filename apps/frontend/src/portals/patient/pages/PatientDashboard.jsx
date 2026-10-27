import { FileHeart, Pill, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { patientService } from '../../../services/patientService.js';
import { AccessLogs } from '../components/AccessLogs.jsx';
import { DoctorAccessCard } from '../components/DoctorAccessCard.jsx';
import { HealthTimeline } from '../components/HealthTimeline.jsx';
import { PatientLayout } from '../components/PatientLayout.jsx';
import { PatientWelcome } from '../components/PatientWelcome.jsx';
import { PatientCountry } from '../components/PatientCountry.jsx';
import { FindDoctor } from '../components/FindDoctor.jsx';
import { MyAppointment } from '../components/MyAppointment.jsx';
import { MyHealthProfile } from '../components/MyHealthProfile.jsx';

const copy = {
  en: {
    languageName: 'বাংলা', navigationLabel: 'Patient sections',
    nav: { dashboard: 'Dashboard', records: 'Medical records', doctors: 'Doctor access',
      findDoctor: 'Find a Doctor', appointments: 'My Appointment',
      timeline: 'Timeline', prescriptions: 'Prescriptions', accessLogs: 'Access history',
      profile: 'Profile', healthProfile: 'My Health Profile', more: 'More' },
    navShort: { dashboard: 'Home', records: 'Records', profile: 'Profile' },
    sidebar: { portal: 'Patient portal', patientId: 'Patient ID',
      privacyTitle: 'Your records, your choice',
      privacyBody: 'Only doctors you authorize can review your medical history.' },
    topbar: { switchLanguage: 'Switch language', allSections: 'Patient sections',
      chooseSection: 'Choose a section to open.' },
    welcome: { eyebrow: 'Your health space', greeting: 'Welcome, {name}',
      message: 'Your medical history is organized and ready when you need it.',
      protected: 'Patient controlled', summaryLabel: 'At a glance',
      bloodGroup: 'Blood group', medicines: 'Prescriptions', nextCheckup: 'Records',
      unavailable: 'Not recorded' },
    timeline: { eyebrow: 'Your history', title: 'Health timeline',
      description: 'Records and prescriptions from your real account, newest first.' },
    states: { emptyTimelineTitle: 'No history yet',
      emptyTimelineBody: 'Add a medical record to begin your timeline.' },
  },
  bn: {
    languageName: 'English', navigationLabel: 'রোগীর বিভাগ',
    nav: { dashboard: 'ড্যাশবোর্ড', records: 'স্বাস্থ্য নথি', doctors: 'ডাক্তারের প্রবেশাধিকার',
      findDoctor: 'ডাক্তার খুঁজুন', appointments: 'আমার অ্যাপয়েন্টমেন্ট',
      timeline: 'টাইমলাইন', prescriptions: 'প্রেসক্রিপশন', accessLogs: 'প্রবেশের ইতিহাস',
      profile: 'প্রোফাইল', healthProfile: 'আমার স্বাস্থ্য প্রোফাইল', more: 'আরও' },
    navShort: { dashboard: 'হোম', records: 'নথি', profile: 'প্রোফাইল' },
    sidebar: { portal: 'রোগীর পোর্টাল', patientId: 'রোগী আইডি',
      privacyTitle: 'আপনার নথি, আপনার সিদ্ধান্ত',
      privacyBody: 'শুধু আপনার অনুমতিপ্রাপ্ত ডাক্তার নথি দেখতে পারবেন।' },
    topbar: { switchLanguage: 'ভাষা পরিবর্তন', allSections: 'রোগীর বিভাগ',
      chooseSection: 'একটি বিভাগ নির্বাচন করুন।' },
    welcome: { eyebrow: 'আপনার স্বাস্থ্যস্পেস', greeting: 'স্বাগতম, {name}',
      message: 'আপনার স্বাস্থ্য ইতিহাস প্রয়োজনের সময় প্রস্তুত।',
      protected: 'রোগীর নিয়ন্ত্রণে', summaryLabel: 'এক নজরে',
      bloodGroup: 'রক্তের গ্রুপ', medicines: 'প্রেসক্রিপশন', nextCheckup: 'নথি',
      unavailable: 'নথিভুক্ত নয়' },
    timeline: { eyebrow: 'আপনার ইতিহাস', title: 'স্বাস্থ্য টাইমলাইন',
      description: 'আপনার আসল নথি ও প্রেসক্রিপশন, নতুন থেকে পুরোনো।' },
    states: { emptyTimelineTitle: 'এখনো ইতিহাস নেই',
      emptyTimelineBody: 'স্বাস্থ্য নথি যোগ করে শুরু করুন।' },
  },
};

export function PatientDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const text = copy[language] ?? copy.en;
  const { data, error, isLoading, reload } = useAsyncResource(patientService.getDashboard);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [appointmentRefresh, setAppointmentRefresh] = useState(0);
  const [doctorRefresh, setDoctorRefresh] = useState(0);

  if (isLoading) return <LoadingScreen label="Loading your medical history…" />;
  if (error || !data) return <ErrorState title="Could not load your medical history"
    description={error?.message || 'Please try again.'} actionLabel="Retry" onRetry={reload} />;

  const patient = { id: data.patient.id, name: data.patient.full_name,
    bloodGroup: data.patient.blood_group || text.welcome.unavailable,
    activeMedicines: String(data.prescriptions.length),
    nextCheckup: String(data.records.length) };
  const events = [
    ...data.records.map(item => ({ id: `record-${item.id}`, type: 'record',
      title: item.title, detail: item.description || 'Medical record', date: item.created_at })),
    ...data.prescriptions.map(item => ({ id: `prescription-${item.id}`, type: 'prescription',
      title: item.medicine, detail: `${item.dosage} · ${item.doctor_name || 'Doctor'}`,
      date: item.created_at })),
  ].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date));

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true); setSaveError('');
    try {
      await patientService.createRecord({ patientId: patient.id, diagnosis, notes });
      setDiagnosis(''); setNotes('');
      await reload();
    } catch (failure) { setSaveError(failure.message || 'Could not save the record.'); }
    finally { setSaving(false); }
  }

  return <PatientLayout copy={text} patient={patient} onToggleLanguage={toggleLanguage}>
    <main id="patient-dashboard" className="mx-auto max-w-[96rem] scroll-mt-24 space-y-8 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12">
      <PatientWelcome copy={text} patient={patient} />
      <div className="grid gap-4 md:grid-cols-3">
        {[{ icon: FileHeart, label: 'Medical records', value: data.records.length, href: '#medical-records' },
          { icon: Pill, label: 'Prescriptions', value: data.prescriptions.length, href: '#prescriptions' },
          { icon: ShieldCheck, label: 'Doctor access', value: 'Your choice', href: '#doctor-access' }].map(item =>
          <a key={item.label} href={item.href} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-lift">
            <span className="grid size-11 place-items-center rounded-2xl bg-health-50 text-health-700"><item.icon className="size-5" /></span>
            <p className="mt-5 text-sm font-semibold text-ink-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-950">{item.value}</p>
          </a>)}
      </div>
      <PatientCountry patient={data.patient} onSaved={reload} />
      <MyHealthProfile />
      <FindDoctor key={`${data.patient.country_code}:${doctorRefresh}`} patient={data.patient}
        onBooked={() => setAppointmentRefresh(value => value + 1)} />
      <MyAppointment key={appointmentRefresh} onChanged={() => setDoctorRefresh(value => value + 1)} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <div className="space-y-6">
          <Card id="medical-records" className="scroll-mt-24 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Personal history</p>
            <h2 className="mt-2 text-2xl font-bold text-ink-950">Medical records</h2>
            {data.records.length === 0 ? <p className="mt-5 text-ink-500">No medical records yet.</p> :
              <ul className="mt-5 divide-y divide-ink-100">{data.records.map(record => <li key={record.id} className="py-4">
                <strong className="text-ink-900">{record.title}</strong>
                {record.description && <p className="mt-1 text-ink-500">{record.description}</p>}
                <time className="mt-2 block text-xs text-health-700" dateTime={record.created_at}>{new Date(record.created_at).toLocaleDateString()}</time>
              </li>)}</ul>}
          </Card>
          <Card id="prescriptions" className="scroll-mt-24 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Care plan</p>
            <h2 className="mt-2 text-2xl font-bold text-ink-950">Prescriptions</h2>
            {data.prescriptions.length === 0 ? <p className="mt-5 text-ink-500">No prescriptions yet.</p> :
              <ul className="mt-5 divide-y divide-ink-100">{data.prescriptions.map(item => <li key={item.id} className="py-4">
                <strong>{item.medicine}</strong><span className="text-ink-500"> · {item.dosage}</span>
                {item.doctor_name && <p className="mt-1 text-sm text-health-700">Prescribed by {item.doctor_name}</p>}
                {item.instructions && <p className="mt-1 text-sm text-ink-500">{item.instructions}</p>}
              </li>)}</ul>}
          </Card>
          <HealthTimeline copy={text} events={events} language={language} />
        </div>
        <div className="space-y-6">
          <Card className="p-5 sm:p-7">
            <span className="grid size-11 place-items-center rounded-2xl bg-health-50 text-health-700"><Plus className="size-5" /></span>
            <h2 className="mt-4 text-xl font-bold">Add a medical record</h2>
            {saveError && <p role="alert" className="mt-3 text-red-700">{saveError}</p>}
            <form className="mt-5 space-y-4" onSubmit={saveRecord}>
              <Input required label="Diagnosis or title" maxLength={300} value={diagnosis} onChange={event => setDiagnosis(event.target.value)} />
              <label className="block text-sm font-semibold text-ink-800">Notes
                <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-ink-100 p-4" maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} />
              </label>
              <Button type="submit" loading={saving}>Save record</Button>
            </form>
          </Card>
          <section id="doctor-access" className="scroll-mt-24"><DoctorAccessCard language={language} onChanged={reload} /></section>
          <AccessLogs />
        </div>
      </div>
    </main>
  </PatientLayout>;
}
