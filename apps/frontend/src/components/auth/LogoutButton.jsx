import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { Button } from '../ui/index.js';
import { authCopy } from './authCopy.js';

export function LogoutButton({ showLabel = false }) {
  const { language } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const label = authCopy[language].access.logout;

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'sm' : 'icon'}
      loading={isLoggingOut}
      onClick={handleLogout}
      aria-label={label}
    >
      {!isLoggingOut ? <LogOut className="size-4" aria-hidden="true" /> : null}
      {showLabel ? label : null}
    </Button>
  );
}
