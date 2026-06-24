import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { isAuthConfigured } from '@/lib/auth';
import { loginPathFor } from '@/lib/authGate';
import { useI18n } from '@/i18n/LocaleProvider';

export function RequireLogin({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (!isAuthConfigured()) return children;

  if (loading) {
    return (
      <div className="page">
        <p className="hint">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginPathFor(returnTo)} replace />;
  }

  return children;
}
