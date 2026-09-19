import { Stethoscope } from 'lucide-react';

import { PortalPlaceholder } from '../../../components/placeholders/PortalPlaceholder.jsx';

export function DoctorPortalPage() {
  return (
    <PortalPlaceholder
      role="Doctor"
      title="Relevant patient context, without the clutter."
      description="This space will support authorized patient access and focused clinical workflows with privacy built into every step."
      icon={Stethoscope}
    />
  );
}
