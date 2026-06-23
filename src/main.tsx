import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { AuthProvider } from '@/auth/AuthProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LocaleProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LocaleProvider>
  </BrowserRouter>,
);