import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App.jsx';
import { LanguageProvider } from './contexts/LanguageProvider.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
