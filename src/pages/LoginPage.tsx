import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/LocaleProvider';
import { getAuthSession, isAuthConfigured, signInWithEmail, signInWithGoogle, signOut, formatAuthError, getAuthCallbackRedirectUrl, completeAuthCallbackFromUrl } from '@/lib/auth';
import { getUserProfile, saveUserProfile } from '@/lib/profile';

export function LoginPage() {
  const { t, translateError } = useI18n();
  const navigate = useNavigate();
  const { isLoggedIn, email, loading } = useAuth();
  const [inputEmail, setInputEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void completeAuthCallbackFromUrl().then(({ error }) => {
      if (error) setMessage(`⚠️ ${translateError(formatAuthError(error))}`);
    });
    void getAuthSession().then((session) => {
      if (session?.user?.email) setInputEmail(session.user.email);
    });
  }, [translateError]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [loading, isLoggedIn, navigate]);

  const handleEmailLogin = async () => {
    setMessage('');
    if (!inputEmail.trim()) {
      setMessage(`⚠️ ${t('auth.emailRequired')}`);
      return;
    }
    setBusy(true);
    const { error } = await signInWithEmail(inputEmail);
    setBusy(false);
    if (error) {
      setMessage(`⚠️ ${translateError(formatAuthError(error))}`);
      return;
    }
    setMessage(t('auth.magicLinkSent'));
  };

  const handleGoogleLogin = async () => {
    setMessage('');
    setBusy(true);
    const { error } = await signInWithGoogle();
    setBusy(false);
    if (error) {
      setMessage(`⚠️ ${translateError(formatAuthError(error))}`);
    }
  };

  const handleLogout = async () => {
    const profile = getUserProfile();
    saveUserProfile({ ...profile, authUserId: undefined });
    await signOut();
    setMessage(t('auth.loggedOut'));
  };

  if (!isAuthConfigured()) {
    return (
      <div className="page login-page">
        <h1 className="page-title">{t('auth.title')}</h1>
        <p className="hint">{translateError('authNotConfigured')}</p>
        <Link to="/" className="btn btn-secondary">{t('common.homeLink')}</Link>
      </div>
    );
  }

  return (
    <div className="page login-page">
      <h1 className="page-title">{t('auth.title')}</h1>
      <p className="page-desc">{t('auth.desc')}</p>

      {message && (
        <div className={`message-box ${message.startsWith('✅') ? 'message-box--ok' : 'message-box--warn'}`}>
          {message}
        </div>
      )}

      <section className="card login-card">
        <label className="label" htmlFor="login-email">{t('auth.emailLabel')}</label>
        <input
          id="login-email"
          type="email"
          className="input"
          autoComplete="email"
          placeholder="you@example.com"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
        />
        <p className="hint hint--compact">{t('auth.magicLinkHint')}</p>
        <p className="hint hint--compact">{t('auth.inAppBrowserHint')}</p>
        <button type="button" className="btn btn-primary btn-large" onClick={handleEmailLogin} disabled={busy}>
          {t('auth.sendMagicLink')}
        </button>

        <div className="login-divider">{t('auth.or')}</div>

        <button type="button" className="btn btn-secondary btn-large" onClick={handleGoogleLogin} disabled={busy}>
          {t('auth.google')}
        </button>
      </section>

      {isLoggedIn && email && (
        <section className="card">
          <p className="hint">{t('auth.currentAccount', { email })}</p>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            {t('auth.logout')}
          </button>
        </section>
      )}

      <p className="hint hint--compact login-anonymous-hint">{t('auth.anonymousHint')}</p>
      <p className="hint hint--compact">{t('auth.redirectTarget', { url: getAuthCallbackRedirectUrl() })}</p>
    </div>
  );
}
