import { CircleAlert } from 'lucide-react';

import { EmptyState } from '../ui/index.js';

export function ErrorState({ actionLabel, description, onRetry, title }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <EmptyState
        className="w-full max-w-xl border-red-100 shadow-card"
        icon={CircleAlert}
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionVariant="secondary"
        onAction={onRetry}
      />
    </main>
  );
}
