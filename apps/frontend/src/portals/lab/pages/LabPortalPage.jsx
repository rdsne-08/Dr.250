import { FlaskConical } from 'lucide-react';

import { PortalPlaceholder } from '../../../components/placeholders/PortalPlaceholder.jsx';

export function LabPortalPage() {
  return (
    <PortalPlaceholder
      role="Laboratory"
      title="Clear report delivery, connected to care."
      description="This space will make assigned tests and secure result delivery straightforward for laboratory teams."
      icon={FlaskConical}
    />
  );
}
