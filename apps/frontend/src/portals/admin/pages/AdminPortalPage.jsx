import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';

import { LogoutButton } from '../../../components/auth/LogoutButton.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { BrandMark } from '../../../components/layout/BrandMark.jsx';
import { Badge, Button, Card, EmptyState, Modal } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { adminService } from '../../../services/adminService.js';

const summary = [
  { status: 'PENDING', label: 'Pending', icon: Clock3 },
  { status: 'VERIFIED', label: 'Approved', icon: CheckCircle2 },
  { status: 'REJECTED', label: 'Rejected', icon: XCircle },
];

export function AdminPortalPage() {
  const { data: doctors, error, isLoading, reload } = useAsyncResource(adminService.getDoctors);
  const [tab, setTab] = useState('PENDING');
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  if (isLoading && !doctors) return <LoadingScreen label="Loading doctor applications…" />;
  if (error && !doctors) return <ErrorState title="Could not load doctor applications"
    description={error.message} actionLabel="Retry" onRetry={reload} />;

  const pending = doctors.filter(doctor => doctor.verification_status === 'PENDING');
  const reviewed = doctors.filter(doctor => doctor.verification_status !== 'PENDING');
  const visible = tab === 'PENDING' ? pending : reviewed;

  async function confirmDecision() {
    if (!decision || busy) return;
    setBusy(true); setActionError(''); setSuccess('');
    try {
      await adminService.decide(decision.doctor.id, decision.status);
      setDecision(null);
      setSuccess(`${decision.doctor.full_name} was ${decision.status === 'VERIFIED' ? 'approved' : 'rejected'}.`);
      reload();
    } catch (failure) {
      setActionError(failure.message || 'The decision could not be saved. Refresh and try again.');
      if (failure.status === 409) { setDecision(null); reload(); }
    } finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-canvas">
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
        <BrandMark /><div className="flex items-center gap-3"><Badge>Admin</Badge><LogoutButton /></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-7 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-health-700">Clinical trust</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-ink-950 sm:text-4xl">Doctor Verification</h1>
          <p className="mt-3 max-w-2xl text-ink-500">Review doctor applications before doctors can access patient-care functionality. Check identity and license details before making a decision.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}><RefreshCw className="size-4" />Refresh</Button>
      </div>
      {success && <p role="status" className="rounded-2xl bg-health-50 p-4 text-health-800">{success}</p>}
      {actionError && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">{actionError}</p>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">Refresh failed: {error.message}</p>}
      <div className="grid gap-4 sm:grid-cols-3">{summary.map(({ status, label, icon: Icon }) =>
        <Card key={status} className="p-5"><Icon className="size-6 text-health-700" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-ink-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-ink-950">{doctors.filter(doctor => doctor.verification_status === status).length}</p>
        </Card>)}</div>
      <div className="flex gap-2 border-b border-ink-100" role="tablist" aria-label="Doctor applications">
        {[['PENDING', 'Pending Review'], ['REVIEWED', 'Reviewed']].map(([value, label]) =>
          <button key={value} type="button" role="tab" aria-selected={tab === value}
            className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === value ? 'border-health-600 text-health-800' : 'border-transparent text-ink-500'}`}
            onClick={() => setTab(value)}>{label}</button>)}</div>
      {visible.length === 0 ? <EmptyState icon={ShieldCheck}
        title={tab === 'PENDING' ? 'No applications awaiting review' : 'No reviewed applications yet'}
        description="Doctor applications will appear here when available." /> :
        <div className="grid gap-4">{visible.map(doctor => <Card key={doctor.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-xl font-bold text-ink-950">{doctor.full_name}</h2>
              <p className="mt-1 text-sm text-ink-500">{doctor.email}</p></div>
            <Badge variant={doctor.verification_status === 'REJECTED' ? 'warning' : 'health'}>{doctor.verification_status}</Badge>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-ink-100 pt-5 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-500">Specialization</dt><dd className="mt-1 font-semibold">{doctor.specialization}</dd></div>
            <div><dt className="text-ink-500">Medical license</dt><dd className="mt-1 font-semibold">{doctor.license_number}</dd></div>
            <div><dt className="text-ink-500">Registered</dt><dd className="mt-1 font-semibold">{doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : 'Unavailable'}</dd></div>
          </dl>
          {doctor.verification_status === 'PENDING' && <div className="mt-5 flex flex-wrap gap-3">
            <Button size="sm" onClick={() => { setActionError(''); setDecision({ doctor, status: 'VERIFIED' }); }}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => { setActionError(''); setDecision({ doctor, status: 'REJECTED' }); }}>Reject</Button>
          </div>}
        </Card>)}</div>}
    </main>
    <Modal isOpen={Boolean(decision)} onClose={() => { if (!busy) setDecision(null); }}
      title={decision?.status === 'VERIFIED' ? 'Approve doctor?' : 'Reject doctor?'}
      description={decision ? `Confirm your decision for ${decision.doctor.full_name} (${decision.doctor.email}).` : ''}>
      {actionError && <p role="alert" className="mb-4 text-sm text-red-700">{actionError}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button>
        <Button variant={decision?.status === 'REJECTED' ? 'danger' : 'primary'} loading={busy}
          onClick={confirmDecision}>{decision?.status === 'REJECTED' ? 'Confirm Rejection' : 'Confirm Approval'}</Button>
      </div>
    </Modal>
  </div>;
}
