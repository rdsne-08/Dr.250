import { AccessLogs } from '../components/AccessLogs.jsx';
import { useMemo } from 'react';
import { FileHeart, Pill } from 'lucide-react';

import { authCopy } from '../../../components/auth/authCopy.js';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { EmptyState } from '../../../components/ui/index.js';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { patientService } from '../../../services/patientService.js';
import { getApiErrorMessage } from '../../../services/apiErrorMessages.js';
import { DoctorAccessCard } from '../components/DoctorAccessCard.jsx';
import { HealthOverview } from '../components/HealthOverview.jsx';
import { HealthTimeline } from '../components/HealthTimeline.jsx';
import { PatientLayout } from '../components/PatientLayout.jsx';
import { PatientWelcome } from '../components/PatientWelcome.jsx';
import { QuickActions } from '../components/QuickActions.jsx';
import { patientCopy } from '../data/patientCopy.js';

export function PatientDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const copy = patientCopy[language];
  const stateCopy = authCopy[language].portalStates;
  const { data: sourceData, error, isLoading, reload } = useAsyncResource(
    patientService.getDashboard,
  );

  const localizedData = useMemo(
    () => {
      if (!sourceData) return null;

      const numberFormatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US');

      return {
        ...sourceData,
        patient: {
          ...sourceData.patient,
          name: sourceData.patient.name[language],
          activeMedicines: numberFormatter.format(sourceData.patient.activeMedicines),
        },
        overview: sourceData.overview.map((item) => ({
          ...item,
          value: numberFormatter.format(item.value),
          detailValue:
            typeof item.detailValue === 'object' ? item.detailValue[language] : item.detailValue,
        })),
        doctorAccess: {
          ...sourceData.doctorAccess,
          activeSessions: numberFormatter.format(sourceData.doctorAccess.activeSessions),
          doctorName: sourceData.doctorAccess.doctorName[language],
          expiresAt: sourceData.doctorAccess.expiresAt[language],
        },
      };
    },
    [language, sourceData],
  );

  if (isLoading) return <LoadingScreen label={stateCopy.loading} />;
  if (error || !localizedData) {
    return (
      <ErrorState
        title={stateCopy.errorTitle}
        description={getApiErrorMessage(error, language, stateCopy.errorBody)}
        actionLabel={stateCopy.retry}
        onRetry={reload}
      />
    );
  }

  const hasRecords = sourceData.overview.find((item) => item.id === 'records')?.value > 0;
  const hasPrescriptions =
    sourceData.overview.find((item) => item.id === 'prescriptions')?.value > 0;

  return (
    <PatientLayout
      copy={copy}
      patient={localizedData.patient}
      onToggleLanguage={toggleLanguage}
    >
      <main
        id="patient-dashboard"
        className="mx-auto max-w-[96rem] scroll-mt-24 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12"
      >
        <PatientWelcome copy={copy} patient={localizedData.patient} />

        <div className="mt-10">
          <HealthOverview copy={copy} items={localizedData.overview} />
        </div>

        {!hasRecords || !hasPrescriptions ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {!hasRecords ? (
              <EmptyState
                icon={FileHeart}
                title={copy.states.emptyRecordsTitle}
                description={copy.states.emptyRecordsBody}
                actionLabel={copy.states.emptyRecordsAction}
                actionHref="#quick-actions"
              />
            ) : null}
            {!hasPrescriptions ? (
              <EmptyState
                icon={Pill}
                title={copy.states.noPrescriptionsTitle}
                description={copy.states.noPrescriptionsBody}
                actionLabel={copy.states.noPrescriptionsAction}
                actionHref="#health-timeline"
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <HealthTimeline copy={copy} events={localizedData.timeline} />
          <QuickActions copy={copy} actions={localizedData.quickActions} />
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
          <DoctorAccessCard copy={copy} language={language} />
        </div>
        <AccessLogs copy={copy} language={language} />
      </main>
    </PatientLayout>
  );
}
