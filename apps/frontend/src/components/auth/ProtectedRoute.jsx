import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { LoadingScreen } from '../feedback/LoadingScreen.jsx';
import { AccessDenied } from './AccessDenied.jsx';
import { authCopy } from './authCopy.js';

export function ProtectedRoute({ allowedRole }) {
  const { language } = useLanguage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen label={authCopy[language].shared.loading} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== allowedRole) {
    return <AccessDenied requiredRole={allowedRole} />;
  }

  return <Outlet />;
}
