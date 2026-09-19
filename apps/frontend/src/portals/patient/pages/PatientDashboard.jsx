import { useMemo } from 'react';

import { useLanguage } from '../../../hooks/useLanguage.js';
import { AIAssistantCard } from '../components/AIAssistantCard.jsx';
import { DoctorAccessCard } from '../components/DoctorAccessCard.jsx';
import { HealthOverview } from '../components/HealthOverview.jsx';
import { HealthTimeline } from '../components/HealthTimeline.jsx';
import { PatientLayout } from '../components/PatientLayout.jsx';
import { PatientWelcome } from '../components/PatientWelcome.jsx';
import { QuickActions } from '../components/QuickActions.jsx';
import { patientCopy } from '../data/patientCopy.js';
import { patientData } from '../data/patientData.js';

export function PatientDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const copy = patientCopy[language];

  const localizedData = useMemo(
    () => {
      const numberFormatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US');

      return {
        ...patientData,
        patient: {
          ...patientData.patient,
          name: patientData.patient.name[language],
          activeMedicines: numberFormatter.format(patientData.patient.activeMedicines),
        },
        overview: patientData.overview.map((item) => ({
          ...item,
          value: numberFormatter.format(item.value),
          detailValue:
            typeof item.detailValue === 'object' ? item.detailValue[language] : item.detailValue,
        })),
        doctorAccess: {
          ...patientData.doctorAccess,
          activeSessions: numberFormatter.format(patientData.doctorAccess.activeSessions),
          doctorName: patientData.doctorAccess.doctorName[language],
          expiresAt: patientData.doctorAccess.expiresAt[language],
        },
      };
    },
    [language],
  );

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

        <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <HealthTimeline copy={copy} events={localizedData.timeline} />
          <QuickActions copy={copy} actions={localizedData.quickActions} />
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
          <DoctorAccessCard copy={copy} access={localizedData.doctorAccess} />
          <AIAssistantCard copy={copy} assistant={localizedData.assistant} />
        </div>
      </main>
    </PatientLayout>
  );
}
