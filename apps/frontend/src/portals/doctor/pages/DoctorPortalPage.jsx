import { useMemo } from 'react';

import { useLanguage } from '../../../hooks/useLanguage.js';
import { ClinicalAssistant } from '../components/ClinicalAssistant.jsx';
import { ConsultationWorkspace } from '../components/ConsultationWorkspace.jsx';
import { DoctorLayout } from '../components/DoctorLayout.jsx';
import { DoctorOverview } from '../components/DoctorOverview.jsx';
import { PatientManagement } from '../components/PatientManagement.jsx';
import { doctorCopy } from '../data/doctorCopy.js';
import { doctorData } from '../data/doctorData.js';

function localize(value, language) {
  return typeof value === 'object' && value !== null && language in value
    ? value[language]
    : value;
}

export function DoctorPortalPage() {
  const { language, toggleLanguage } = useLanguage();
  const copy = doctorCopy[language];

  const localizedData = useMemo(() => {
    const numberFormatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US');

    return {
      ...doctorData,
      doctor: {
        ...doctorData.doctor,
        name: localize(doctorData.doctor.name, language),
        specialty: localize(doctorData.doctor.specialty, language),
      },
      stats: doctorData.stats.map((stat) => ({
        ...stat,
        value: numberFormatter.format(stat.value),
      })),
      appointments: doctorData.appointments.map((appointment) => ({
        ...appointment,
        patientName: localize(appointment.patientName, language),
        reason: localize(appointment.reason, language),
        age: numberFormatter.format(appointment.age),
      })),
      patients: doctorData.patients.map((patient) => ({
        ...patient,
        name: localize(patient.name, language),
        age: numberFormatter.format(patient.age),
        sex: localize(patient.sex, language),
        summary: localize(patient.summary, language),
        flags: patient.flags.map((flag) => localize(flag, language)),
        history: patient.history.map((item) => ({
          ...item,
          date: localize(item.date, language),
          title: localize(item.title, language),
          detail: localize(item.detail, language),
        })),
      })),
    };
  }, [language]);

  return (
    <DoctorLayout
      copy={copy}
      doctor={localizedData.doctor}
      onToggleLanguage={toggleLanguage}
    >
      <main
        id="doctor-overview"
        className="mx-auto max-w-[100rem] scroll-mt-24 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12"
      >
        <DoctorOverview
          appointments={localizedData.appointments}
          copy={copy}
          doctor={localizedData.doctor}
          stats={localizedData.stats}
        />

        <div className="mt-7">
          <PatientManagement copy={copy} patients={localizedData.patients} />
        </div>

        <div className="mt-7 grid items-start gap-7 2xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.55fr)]">
          <ConsultationWorkspace appointments={localizedData.appointments} copy={copy} />
          <ClinicalAssistant copy={copy} />
        </div>
      </main>
    </DoctorLayout>
  );
}
