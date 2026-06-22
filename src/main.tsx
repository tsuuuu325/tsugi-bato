import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </BrowserRouter>,
);