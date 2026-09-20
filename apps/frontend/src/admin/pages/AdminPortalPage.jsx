import { ShieldCheck } from 'lucide-react';

import { PortalPlaceholder } from '../../components/placeholders/PortalPlaceholder.jsx';

export function AdminPortalPage() {
  return (
    <PortalPlaceholder
      role="Admin"
      title="A focused place to keep the platform healthy."
      description="Administrative controls, verification workflows, and platform oversight will live here in a future phase."
      icon={ShieldCheck}
    />
  );
}
