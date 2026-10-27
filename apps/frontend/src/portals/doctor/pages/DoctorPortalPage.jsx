import { FileHeart, Pill, Search, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { Avatar, Badge, Button, Card, Input } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { doctorService } from '../../../services/doctorService.js';
import { DoctorLayout } from '../components/DoctorLayout.jsx';
import { ProfessionalProfile } from '../components/ProfessionalProfile.jsx';
import { TodayAvailability } from '../components/TodayAvailability.jsx';
import { TodayQueue } from '../components/TodayQueue.jsx';

const emptyPrescription = { medicine: '', dosage: '', duration: '', instructions: '' };
const copies = {
  en: { languageName: 'বাংলা', navigationLabel: 'Doctor sections',
    nav: { overview: 'Overview', patients: 'Authorized patients', records: 'Patient records',
      prescriptions: 'Write prescription', profile: 'Professional Profile', availability: 'Today’s Availability', queue: 'Today’s Queue', more: 'More' },
    navShort: { overview: 'Home', patients: 'Patients', records: 'Records', profile: 'Profile' },
    sidebar: { portal: 'Doctor portal', doctorId: 'Doctor ID',
      privacyTitle: 'Access follows consent',
      privacyBody: 'Patient records are available only while their grant is active.' },
    topbar: { switchLanguage: 'Switch language', allSections: 'Doctor sections',
      chooseSection: 'Choose a section to open.' } },
  bn: { languageName: 'English', navigationLabel: 'ডাক্তারের বিভাগ',
    nav: { overview: 'ড্যাশবোর্ড', patients: 'অনুমতিপ্রাপ্ত রোগী', records: 'রোগীর নথি',
      prescriptions: 'প্রেসক্রিপশন লিখুন', profile: 'পেশাগত প্রোফাইল', availability: 'আজকের সময়সূচি', queue: 'আজকের সারি', more: 'আরও' },
    navShort: { overview: 'হোম', patients: 'রোগী', records: 'নথি', profile: 'প্রোফাইল' },
    sidebar: { portal: 'ডাক্তারের পোর্টাল', doctorId: 'ডাক্তার আইডি',
      privacyTitle: 'অনুমতির ভিত্তিতে প্রবেশ',
      privacyBody: 'রোগীর সক্রিয় অনুমতি থাকলেই নথি দেখা যাবে।' },
    topbar: { switchLanguage: 'ভাষা পরিবর্তন', allSections: 'ডাক্তারের বিভাগ',
      chooseSection: 'একটি বিভাগ নির্বাচন করুন।' } },
};

export function DoctorPortalPage() {
  const { language, toggleLanguage } = useLanguage();
  const { data, error, isLoading, reload } = useAsyncResource(doctorService.getDashboard);
  const [patientId, setPatientId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyPrescription);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [consultation, setConsultation] = useState(null);
  const [consultationError, setConsultationError] = useState('');

  async function openConsultation(appointmentId) {
    setConsultationError('');
    try {
      const visit = await doctorService.getConsultation(appointmentId);
      setConsultation(visit); setPatientId(visit.patient_id);
      document.getElementById('patient-records')?.scrollIntoView({ behavior: 'smooth' });
      await reload();
    } catch (failure) { setConsultationError(failure.message || 'Could not open consultation.'); throw failure; }
  }
  function closeConsultation(appointmentId) {
    if (consultation?.id === appointmentId) setConsultation(null);
    setPatientId(''); reload();
  }

  if (isLoading) return <LoadingScreen label="Loading authorized patients…" />;
  if (error || !data) return <ErrorState title="Could not load doctor workspace"
    description={error?.message || 'Please try again.'} actionLabel="Retry" onRetry={reload} />;

  const copy = copies[language] ?? copies.en;
  const consultationPatient = consultation && { ...consultation, id: consultation.patient_id,
    records: consultation.records, prescriptions: consultation.prescriptions };
  const selected = consultationPatient?.id === patientId ? consultationPatient
    : data.patients.find(patient => patient.id === patientId) ?? data.patients[0];
  const visiblePatients = data.patients.filter(patient =>
    patient.full_name.toLowerCase().includes(search.toLowerCase().trim()));
  const doctor = { id: data.doctor.id, name: data.doctor.full_name,
    specialty: data.doctor.specialization };

  async function prescribe(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setSaveError(''); setMessage('');
    try {
      await doctorService.createPrescription({ patientId: selected.id, ...form });
      setForm(emptyPrescription);
      if (consultation) setConsultation(await doctorService.getConsultation(consultation.id));
      await reload();
      setMessage('Prescription saved to this patient’s profile.');
    } catch (failure) { setSaveError(failure.message || 'Could not save prescription.'); }
    finally { setSaving(false); }
  }

  return <DoctorLayout copy={copy} doctor={doctor} onToggleLanguage={toggleLanguage}>
    <main id="doctor-overview" className="mx-auto max-w-[100rem] scroll-mt-24 space-y-8 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12">
      <section id="clinical-workspace" className="relative overflow-hidden rounded-3xl bg-ink-950 p-6 text-white shadow-lift sm:p-9">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-health-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-health-300">Clinical workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Doctor workspace</h1>
            <p className="mt-2 text-white/70">{doctor.name} · {doctor.specialty}</p>
          </div>
          <span className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/10 text-health-200">
            <Stethoscope className="size-8" aria-hidden="true" />
          </span>
        </div>
      </section>

      {data.doctor.verification_status !== 'VERIFIED' ? <Card className="border-health-100 p-6">
        <ShieldCheck className="size-8 text-health-700" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold">{data.doctor.verification_status === 'REJECTED'
          ? 'Application rejected' : 'Verification pending'}</h2>
        <p className="mt-2 text-ink-500">{data.doctor.verification_status === 'REJECTED'
          ? 'Your doctor application was not approved. Patient records and prescription tools are unavailable.'
          : 'Your application is awaiting review. Patient records and prescription tools become available after approval.'}</p>
      </Card> : <>
        {consultationError && <p className="text-red-700" role="alert">{consultationError}</p>}
        {consultation && <Card className="border-health-200 bg-health-50 p-5">
          <strong className="text-health-900">Active consultation · Queue #{consultation.queue_position} · {consultation.local_date}</strong>
          <p className="mt-2 text-sm">{consultation.full_name} · Blood group: {consultation.blood_group || 'Not recorded'} · Date of birth: {consultation.date_of_birth || 'Not recorded'}</p>
          <p className="mt-1 text-sm">Conditions, allergies, and measurements appear in medical records if recorded.</p>
        </Card>}
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ icon: UsersRound, label: 'Authorized patients', value: data.patients.length },
            { icon: FileHeart, label: 'Visible records', value: data.patients.reduce((n, patient) => n + patient.records.length, 0) },
            { icon: Pill, label: 'Prescriptions', value: data.patients.reduce((n, patient) => n + patient.prescriptions.length, 0) }].map(item =>
            <Card key={item.label} className="p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-health-50 text-health-700"><item.icon className="size-5" /></span>
              <p className="mt-5 text-sm font-semibold text-ink-500">{item.label}</p>
              <p className="mt-1 text-3xl font-bold text-ink-950">{item.value}</p>
            </Card>)}
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <Card id="authorized-patients" className="scroll-mt-24 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Patient consent</p>
            <h2 className="mt-2 text-2xl font-bold text-ink-950">Patients who granted access</h2>
            <Button className="mt-4" variant="outline" size="sm" onClick={reload}>Refresh connections</Button>
            {data.patients.length === 0 ? <p className="mt-5 text-ink-500">No patients have granted you active access.</p> : <>
              <div className="relative mt-5"><Search className="absolute left-4 top-4 size-4 text-ink-300" aria-hidden="true" />
                <Input className="pl-11" aria-label="Search patients" placeholder="Search patients" value={search}
                  onChange={event => setSearch(event.target.value)} /></div>
              <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
                {visiblePatients.map(patient => <button key={patient.id} type="button"
                  onClick={() => setPatientId(patient.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected?.id === patient.id
                    ? 'border-health-300 bg-health-50 shadow-card' : 'border-ink-100 hover:border-health-200'}`}>
                  <Avatar name={patient.full_name} />
                  <span className="min-w-0 flex-1"><strong className="block truncate">{patient.full_name}</strong>
                    <small className="text-ink-500">{patient.records.length} records · {patient.prescriptions.length} prescriptions</small></span>
                  {selected?.id === patient.id && <Badge>Selected</Badge>}
                </button>)}
                {visiblePatients.length === 0 && <p className="text-sm text-ink-500">No matching patients.</p>}
              </div>
            </>}
          </Card>
          {selected && <div className="space-y-6">
            <Card id="patient-records" className="scroll-mt-24 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Authorized history</p>
              <h2 className="mt-2 text-2xl font-bold text-ink-950">Medical records · {selected.full_name}</h2>
              {selected.records.length === 0 ? <p className="mt-5 text-ink-500">No medical records yet.</p> :
                <div className="relative mt-6 border-l border-health-100 pl-6">{selected.records.map(record =>
                  <article key={record.id} className="relative border-b border-ink-100 py-4 first:pt-0 last:border-0">
                    <span className="absolute -left-[1.8rem] top-5 size-3 rounded-full border-2 border-white bg-health-500" />
                    <strong>{record.diagnosis || 'Medical record'}</strong>
                    {record.notes && <p className="mt-1 text-sm text-ink-500">{record.notes}</p>}
                    {record.date && <time className="mt-2 block text-xs text-health-700" dateTime={record.date}>{new Date(record.date).toLocaleDateString()}</time>}
                  </article>)}</div>}
            </Card>
            <Card id="patient-prescriptions" className="p-5 sm:p-7">
              <h2 className="text-2xl font-bold text-ink-950">Prescriptions</h2>
              {selected.prescriptions.length === 0 ? <p className="mt-4 text-ink-500">No prescriptions yet.</p> :
                <ul className="mt-4 divide-y divide-ink-100">{selected.prescriptions.map(item => <li key={item.id} className="py-3">
                  <strong>{item.medicine}</strong><span className="text-ink-500"> · {item.dosage}</span>
                  {item.instructions && <p className="mt-1 text-sm text-ink-500">{item.instructions}</p>}
                </li>)}</ul>}
            </Card>
            {consultation?.patient_id === selected.id && <Card id="create-prescription" className="scroll-mt-24 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-health-700">Care plan</p>
              <h2 className="mt-2 text-2xl font-bold text-ink-950">Create prescription</h2>
              <p className="mt-2 text-sm text-ink-500">For {selected.full_name}. It will appear in this patient’s profile.</p>
              {message && <p className="mt-3 text-health-700" role="status">{message}</p>}
              {saveError && <p className="mt-3 text-red-700" role="alert">{saveError}</p>}
              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={prescribe}>
                {['medicine', 'dosage', 'duration', 'instructions'].map(field => <Input key={field}
                  required={field !== 'duration'} label={field[0].toUpperCase() + field.slice(1)}
                  value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} />)}
                <Button className="sm:col-span-2" type="submit" loading={saving}>Save prescription</Button>
              </form>
            </Card>}
          </div>}
        </div>
      </>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ProfessionalProfile doctor={data.doctor} onSaved={reload} />
        <TodayAvailability key={`${data.doctor.id}:${data.doctor.updated_at}`} doctor={data.doctor} />
      </div>
      <TodayQueue onOpen={openConsultation} onComplete={closeConsultation} />
    </main>
  </DoctorLayout>;
}
