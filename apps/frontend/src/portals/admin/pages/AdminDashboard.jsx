import { useState } from 'react';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { adminService } from '../../../services/adminService.js';
import { AdminLayout } from '../components/AdminLayout.jsx';
import { adminCopy } from '../data/adminCopy.js';
import { Button, Card } from '../../../components/ui/index.js';

export function AdminDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const { data, error, isLoading, reload } = useAsyncResource(adminService.getDashboard);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function decide(row, type, status) {
    setBusy(true); setMessage('');
    try {
      const confirmed = await adminService.verify(row.id, type, status);
      setMessage(`Server confirmed: ${confirmed.verification_status}`);
      reload();
    } catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  }
  return <AdminLayout admin={{ name: 'Administrator', role: 'ADMIN', id: '', shift: '' }}
    copy={adminCopy[language]} onToggleLanguage={toggleLanguage}>
    <main id="admin-dashboard" className="mx-auto max-w-6xl space-y-6 p-6 pb-28">
      <h1 className="text-3xl font-bold">Administration</h1>
      <p>Provider verification is saved on the server. Operational metrics and settings are not available.</p>
      <Button disabled={busy || isLoading} onClick={reload}>Refresh lists</Button>
      {message && <p role="status">{message}</p>}
      {isLoading && <p role="status">Loading current accounts?</p>}
      {error && <p role="alert">{error.message}</p>}
      {!isLoading && !error && data && <>
        <Card id="user-management" className="p-5">
          <h2 className="text-xl font-bold">Accounts ({data.users.length})</h2>
          {data.users.map(user => <p key={user.id} className="mt-3">{user.full_name} ? {user.role} ? {user.email}</p>)}
        </Card>
        <section id="verification-center" className="space-y-6">
          {[['DOCTOR', data.doctors, 'doctor-users'], ['LAB', data.labs, 'laboratory-users']].map(([type, rows, id]) =>
            <Card key={type} id={id} className="p-5">
              <h2 className="text-xl font-bold">{type === 'DOCTOR' ? 'Doctors' : 'Laboratories'} ({rows.length})</h2>
              {rows.length === 0 && <p>No registered providers.</p>}
              {rows.map(row => <article key={row.id} className="mt-4 space-y-2 border-t pt-4">
                <h3 className="font-bold">{row.lab_name || row.full_name}</h3>
                <p>{row.specialization} ? License: {row.license_number}</p>
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
