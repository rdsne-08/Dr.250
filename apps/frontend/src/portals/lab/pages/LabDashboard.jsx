import { useMemo } from 'react';

import { authCopy } from '../../../components/auth/authCopy.js';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen.jsx';
import { useAsyncResource } from '../../../hooks/useAsyncResource.js';
import { useLanguage } from '../../../hooks/useLanguage.js';
import { labService } from '../../../services/labService.js';
import { getApiErrorMessage } from '../../../services/apiErrorMessages.js';
import { DoctorRequests } from '../components/DoctorRequests.jsx';
import { LabLayout } from '../components/LabLayout.jsx';
import { LabOverview } from '../components/LabOverview.jsx';
import { ReportTimeline } from '../components/ReportTimeline.jsx';
import { ReportUpload } from '../components/ReportUpload.jsx';
import { TestManagement } from '../components/TestManagement.jsx';
import { labCopy } from '../data/labCopy.js';

function localize(value, language) {
  return typeof value === 'object' && value !== null && language in value
    ? value[language]
    : value;
}

export function LabDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const copy = labCopy[language];
  const stateCopy = authCopy[language].portalStates;
  const { data: sourceData, error, isLoading, reload } = useAsyncResource(
    labService.getDashboard,
  );

  const localizedData = useMemo(() => {
    if (!sourceData) return null;

    const numberFormatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US');
    const patients = sourceData.patients.map((patient) => ({
      ...patient,
      name: localize(patient.name, language),
      age: numberFormatter.format(patient.age),
      sex: localize(patient.sex, language),
    }));
    const doctors = sourceData.doctors.map((doctor) => ({
      ...doctor,
      name: localize(doctor.name, language),
      specialty: localize(doctor.specialty, language),
    }));
    const patientById = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
    const doctorById = Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor]));
    const tests = sourceData.tests.map((test) => ({
      ...test,
      name: localize(test.name, language),
      requestedAt: localize(test.requestedAt, language),
      dueAt: localize(test.dueAt, language),
      patient: patientById[test.patientId],
      doctor: doctorById[test.doctorId],
    }));
    const testById = Object.fromEntries(tests.map((test) => [test.id, test]));

    return {
      laboratory: {
        ...sourceData.laboratory,
        name: localize(sourceData.laboratory.name, language),
        branch: localize(sourceData.laboratory.branch, language),
      },
      workload: Object.fromEntries(
        Object.entries(sourceData.workload).map(([key, value]) => [key, numberFormatter.format(value)]),
      ),
      overview: sourceData.overview.map((item) => ({
        ...item,
        value: numberFormatter.format(item.value),
        detail: numberFormatter.format(item.detail),
      })),
      patients,
      doctors,
      tests,
      reports: sourceData.reports.map((report) => ({
        ...report,
        uploadedAt: localize(report.uploadedAt, language),
      })),
      doctorRequests: sourceData.doctorRequests.map((request) => ({
        ...request,
        doctor: doctorById[request.doctorId],
        patient: patientById[request.patientId],
        test: testById[request.testId],
      })),
      reportTimeline: sourceData.reportTimeline.map((event) => ({
        ...event,
        time: localize(event.time, language),
        patient: patientById[event.patientId],
      })),
    };
  }, [language, sourceData]);

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

  return (
    <LabLayout
      copy={copy}
      laboratory={localizedData.laboratory}
      onToggleLanguage={toggleLanguage}
    >
      <main
        id="lab-dashboard"
        className="mx-auto max-w-[100rem] scroll-mt-24 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12"
      >
        <LabOverview
          copy={copy}
          laboratory={localizedData.laboratory}
          overview={localizedData.overview}
          workload={localizedData.workload}
        />

        <div className="mt-9">
          <TestManagement copy={copy} tests={localizedData.tests} />
        </div>

        <div className="mt-9 grid items-start gap-6 2xl:grid-cols-[minmax(0,1.4fr)_minmax(21rem,0.6fr)]">
          <ReportUpload copy={copy} onUploaded={reload} />
          <DoctorRequests copy={copy} requests={localizedData.doctorRequests} />
        </div>

        <div className="mt-6">
          <ReportTimeline copy={copy} events={localizedData.reportTimeline} />
        </div>
      </main>
    </LabLayout>
  );
}
