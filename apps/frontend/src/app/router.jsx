import { createBrowserRouter } from 'react-router-dom';

import { AdminPortalPage } from '../admin/pages/AdminPortalPage.jsx';
import { DoctorPortalPage } from '../portals/doctor/pages/DoctorPortalPage.jsx';
import { LabPortalPage } from '../portals/lab/pages/LabPortalPage.jsx';
import { PatientPortalPage } from '../portals/patient/pages/PatientPortalPage.jsx';
import { AuthPlaceholderPage } from './pages/AuthPlaceholderPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPlaceholderPage mode="login" /> },
  { path: '/register', element: <AuthPlaceholderPage mode="register" /> },
  { path: '/patient', element: <PatientPortalPage /> },
  { path: '/doctor', element: <DoctorPortalPage /> },
  { path: '/lab', element: <LabPortalPage /> },
  { path: '/admin', element: <AdminPortalPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
