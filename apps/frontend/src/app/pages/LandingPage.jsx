import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui/index.js';

export function LandingPage() {
  return <main className="min-h-screen bg-canvas px-4 py-12 sm:py-24">
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold text-ink-950 sm:text-5xl">Dr.250</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-600">A patient-controlled medical history shared with verified doctors.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button as={Link} to="/register">Create an account</Button>
        <Button as={Link} to="/login" variant="outline">Sign in</Button>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <Card className="p-6"><h2 className="text-xl font-bold">For patients</h2>
          <p className="mt-2">View records and prescriptions. Choose a verified doctor, grant access, and revoke it when you want.</p></Card>
        <Card className="p-6"><h2 className="text-xl font-bold">For doctors</h2>
          <p className="mt-2">After verification and a patient’s grant, review their medical history and create prescriptions.</p></Card>
      </div>
    </div>
  </main>;
}
