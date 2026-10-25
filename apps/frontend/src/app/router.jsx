import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../components/auth/ProtectedRoute.jsx';
import { DoctorPortalPage } from '../portals/doctor/pages/DoctorPortalPage.jsx';
import { PatientDashboard } from '../portals/patient/index.js';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { AUTH_ROLES } from '../services/authService.js';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute allowedRole={AUTH_ROLES.PATIENT} />,
    children: [{ path: '/patient', element: <PatientDashboard /> }],
  },
  {
    element: <ProtectedRoute allowedRole={AUTH_ROLES.DOCTOR} />,
    children: [{ path: '/doctor', element: <DoctorPortalPage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]);
