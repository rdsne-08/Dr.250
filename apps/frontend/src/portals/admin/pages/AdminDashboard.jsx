import { useState } from 'react';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { adminService } from '../../../services/adminService.js';
import { AdminLayout } from '../components/AdminLayout.jsx';
import { SystemHealth } from '../components/SystemHealth.jsx';
import { adminCopy } from '../data/adminCopy.js';
import { Button, Card } from '../../../components/ui/index.js';

export function AdminDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const { data, error, isLoading, reload } = useAsyncResource(adminService.getDashboard);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  async function decide(row, type, status) {
    setBusy(true); setMessage(''); setActionError('');
    try {
      const confirmed = await adminService.verify(row.id, type, status);
      setMessage(`${row.lab_name || row.full_name}: ${confirmed.verification_status}`);
      reload();
    } catch (failure) { setActionError(failure.message); }
    finally { setBusy(false); }
  }
  return <AdminLayout admin={{ name: 'Administrator', role: 'ADMIN', id: '', shift: '' }}
    copy={adminCopy[language]} onToggleLanguage={toggleLanguage}>
    <main id="admin-dashboard" className="mx-auto max-w-6xl space-y-6 p-6 pb-28">
      <h1 className="text-3xl font-bold">Administration</h1>
      <p>Account lists, provider decisions, and verification activity come from the server. Other operational metrics are unavailable.</p>
      <Button disabled={busy || isLoading} onClick={reload}>Refresh dashboard</Button>
      {message && <p role="status">{message}</p>}
      {actionError && <p role="alert">{actionError}</p>}
      {isLoading && <p role="status">Loading admin data…</p>}
      {!isLoading && error && <p role="alert">Could not load admin data: {error.message}</p>}
      {!isLoading && !error && data && <>
        <SystemHealth copy={adminCopy[language]} services={data.health} />
        <Card id="platform-activity" className="scroll-mt-24 p-5">
          <h2 className="text-xl font-bold">Recent verification activity</h2>
          {data.activity.length === 0 && <p className="mt-3">No verification decisions recorded.</p>}
          <ul className="mt-3 divide-y divide-ink-100">{data.activity.map(event => <li key={event.id} className="py-3">
            <strong>{event.provider_name || 'Provider no longer available'}</strong> · {event.entity_type} · {event.status}
            <time className="ml-2 text-sm text-ink-500" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</time>
          </li>)}</ul>
        </Card>
        <Card id="user-management" className="p-5">
          <h2 className="text-xl font-bold">Accounts ({data.users.length})</h2>
          {data.users.length === 0 && <p className="mt-3">No accounts found.</p>}
          {data.users.map(user => <p key={user.id} className="mt-3">{user.full_name} · {user.role} · {user.email}</p>)}
        </Card>
        <section id="verification-center" className="space-y-6">
          {[['DOCTOR', data.doctors, 'doctor-users'], ['LAB', data.labs, 'laboratory-users']].map(([type, rows, id]) =>
            <Card key={type} id={id} className="p-5">
              <h2 className="text-xl font-bold">{type === 'DOCTOR' ? 'Doctors' : 'Laboratories'} ({rows.length})</h2>
              {rows.length === 0 && <p>No registered providers.</p>}
              {rows.map(row => <article key={row.id} className="mt-4 space-y-2 border-t pt-4">
                <h3 className="font-bold">{row.lab_name || row.full_name}</h3>
                <p>{row.specialization ? `${row.specialization} · ` : ''}License: {row.license_number}</p>
                <p>Status: <strong>{row.verification_status}</strong></p>
                <div className="flex flex-wrap gap-2">
                  {['VERIFIED', 'REJECTED', 'SUSPENDED'].map(status => <Button key={status}
                    disabled={busy || row.verification_status === status}
                    onClick={() => decide(row, type, status)}>{status}</Button>)}
                </div>
              </article>)}
            </Card>)}
        </section>
      </>}
    </main>
  </AdminLayout>;
}
