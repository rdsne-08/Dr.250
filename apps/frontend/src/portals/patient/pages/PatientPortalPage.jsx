import { HeartHandshake } from 'lucide-react';

import { PortalPlaceholder } from '../../../components/placeholders/PortalPlaceholder.jsx';

export function PatientPortalPage() {
  return (
    <PortalPlaceholder
      role="Patient"
      title="Your health, organized around you."
      description="This space will bring personal records, prescriptions, reports, and consent controls together in one clear experience."
      icon={HeartHandshake}
    />
  );
}
