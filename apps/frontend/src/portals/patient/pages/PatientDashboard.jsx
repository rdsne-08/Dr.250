import { AccessLogs } from '../components/AccessLogs.jsx';
import { DoctorAccessCard } from '../components/DoctorAccessCard.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { LogoutButton } from '../../../components/auth/LogoutButton.jsx';
import { Button, Card } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { patientService } from '../../../services/patientService.js';

export function PatientDashboard() {
  const { data, error, isLoading, reload } = useAsyncResource(patientService.getDashboard);
  if (isLoading) return <LoadingScreen label="Loading your medical history…" />;
  if (error || !data) return <ErrorState title="Could not load your medical history"
    description={error?.message || 'Please try again.'} actionLabel="Retry" onRetry={reload} />;

  return <main className="min-h-screen bg-canvas p-4 sm:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">My medical history</h1>
          <p>{data.patient.full_name}</p></div>
        <LogoutButton />
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Patient sections">
        <a href="#medical-records">Medical records</a>
        <a href="#prescriptions">Prescriptions</a>
        <a href="#doctor-access">Doctor access</a>
        <a href="#access-logs">Access history</a>
      </nav>
      <Button variant="outline" onClick={reload}>Refresh history</Button>
      <Card id="medical-records" className="scroll-mt-24 p-6"><h2 className="text-xl font-bold">Medical records</h2>
        {data.records.length === 0 ? <p className="mt-3">No medical records yet.</p> :
          <ul className="mt-3 divide-y">{data.records.map(record => <li key={record.id} className="py-3">
            <strong>{record.title || 'Medical record'}</strong>
            {record.description && <p>{record.description}</p>}
            {record.created_at && <time className="text-sm text-ink-500" dateTime={record.created_at}>
              {new Date(record.created_at).toLocaleDateString()}</time>}
          </li>)}</ul>}
      </Card>
      <Card id="prescriptions" className="scroll-mt-24 p-6"><h2 className="text-xl font-bold">Prescriptions</h2>
        {data.prescriptions.length === 0 ? <p className="mt-3">No prescriptions yet.</p> :
          <ul className="mt-3 divide-y">{data.prescriptions.map(item => <li key={item.id} className="py-3">
            <strong>{item.medicine}</strong> · {item.dosage}
            {item.doctor_name && <p>Prescribed by {item.doctor_name}</p>}
            {item.instructions && <p>{item.instructions}</p>}
          </li>)}</ul>}
      </Card>
      <section id="doctor-access" className="scroll-mt-24"><DoctorAccessCard onChanged={reload} /></section>
      <AccessLogs />
    </div>
  </main>;
}
