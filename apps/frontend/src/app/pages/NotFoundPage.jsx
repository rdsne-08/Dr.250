import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandMark } from '../../components/layout/BrandMark.jsx';
import { Button, Card } from '../../components/ui/index.js';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <Card className="w-full max-w-xl p-8 text-center sm:p-12">
        <BrandMark className="justify-center" />
        <span className="mx-auto mt-10 grid size-16 place-items-center rounded-3xl bg-health-100 text-health-700">
          <SearchX className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-health-700">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-ink-950">Page not found</h1>
        <p className="mt-4 text-lg leading-8 text-ink-500">
          The page you are looking for may have moved or is not available yet.
        </p>
        <Button as={Link} to="/" className="mt-8">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return home
        </Button>
      </Card>
    </main>
  );
}
