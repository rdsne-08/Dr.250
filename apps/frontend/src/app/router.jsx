import { createBrowserRouter } from 'react-router-dom';

import { AdminDashboard } from '../portals/admin/index.js';
import { DoctorPortalPage } from '../portals/doctor/pages/DoctorPortalPage.jsx';
import { LabPortalPage } from '../portals/lab/pages/LabPortalPage.jsx';
import { PatientDashboard } from '../portals/patient/index.js';
import { AuthPlaceholderPage } from './pages/AuthPlaceholderPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPlaceholderPage mode="login" /> },
  { path: '/register', element: <AuthPlaceholderPage mode="register" /> },
  { path: '/patient', element: <PatientDashboard /> },
  { path: '/doctor', element: <DoctorPortalPage /> },
  { path: '/lab', element: <LabPortalPage /> },
  { path: '/admin', element: <AdminDashboard /> },
  { path: '*', element: <NotFoundPage /> },
]);
