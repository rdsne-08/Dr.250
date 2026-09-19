import { useMemo } from 'react';

import { useLanguage } from '../../../hooks/useLanguage.js';
import { AdminLayout } from '../components/AdminLayout.jsx';
import { AdminOverview } from '../components/AdminOverview.jsx';
import { PlatformActivity } from '../components/PlatformActivity.jsx';
import { SystemHealth } from '../components/SystemHealth.jsx';
import { UserManagement } from '../components/UserManagement.jsx';
import { VerificationCenter } from '../components/VerificationCenter.jsx';
import { adminCopy } from '../data/adminCopy.js';
import { adminData } from '../data/adminData.js';

function localize(value, language) {
  return typeof value === 'object' && value !== null && language in value
    ? value[language]
    : value;
}

function localizePeople(people, language) {
  return people.map((person) => ({
    ...person,
    name: localize(person.name, language),
    detail: localize(person.detail, language),
  }));
}

export function AdminDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const copy = adminCopy[language];

  const localizedData = useMemo(() => {
    const numberFormatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US');

    return {
      admin: {
        ...adminData.admin,
        name: localize(adminData.admin.name, language),
        role: localize(adminData.admin.role, language),
        shift: localize(adminData.admin.shift, language),
      },
      platform: {
        ...adminData.platform,
        reviewedAt: localize(adminData.platform.reviewedAt, language),
      },
      overview: adminData.overview.map((item) => ({
        ...item,
        value: numberFormatter.format(item.value),
        detail: numberFormatter.format(item.detail),
      })),
      users: localizePeople(adminData.users, language),
      doctors: localizePeople(adminData.doctors, language),
      labs: localizePeople(adminData.labs, language),
      verificationRequests: adminData.verificationRequests.map((request) => ({
        ...request,
        name: localize(request.name, language),
        qualification: localize(request.qualification, language),
        submittedAt: localize(request.submittedAt, language),
        documents: numberFormatter.format(request.documents),
      })),
      activity: adminData.activity.map((event) => ({
        ...event,
        time: localize(event.time, language),
        actor: localize(event.actor, language),
      })),
      systemHealth: adminData.systemHealth,
    };
  }, [language]);

  return (
    <AdminLayout admin={localizedData.admin} copy={copy} onToggleLanguage={toggleLanguage}>
      <main
        id="admin-dashboard"
        className="mx-auto max-w-[100rem] scroll-mt-24 px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12"
      >
        <AdminOverview
          admin={localizedData.admin}
          copy={copy}
          overview={localizedData.overview}
          platform={localizedData.platform}
        />

        <div className="mt-9">
          <UserManagement
            copy={copy}
            doctors={localizedData.doctors}
            labs={localizedData.labs}
            users={localizedData.users}
          />
        </div>

        <div className="mt-9">
          <VerificationCenter copy={copy} requests={localizedData.verificationRequests} />
        </div>

        <div className="mt-6 grid items-start gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <PlatformActivity copy={copy} events={localizedData.activity} />
          <SystemHealth copy={copy} services={localizedData.systemHealth} />
        </div>
      </main>
    </AdminLayout>
  );
}
