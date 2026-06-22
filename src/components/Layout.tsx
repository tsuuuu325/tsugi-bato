import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useI18n } from '@/i18n/LocaleProvider';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import { trackPageView } from '@/lib/analytics';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t } = useI18n();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">{t('app.name')}</span>
        </Link>
        <nav className="header-nav">
          <Link
            to="/me"
            className={`header-icon-btn ${location.pathname === '/me' ? 'header-icon-btn--active' : ''}`}
            aria-label={t('nav.myPage')}
            title={t('nav.myPage')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="header-icon-btn-svg">
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" fill="currentColor" />
            </svg>
          </Link>
          <Link to="/timeline" className={`header-link ${location.pathname === '/timeline' ? 'header-link--active' : ''}`}>
            🌍 {t('nav.timeline')}
          </Link>
          <LanguageSwitcher />
          {!isHome && (
            <Link to="/" className="back-link">
              {t('nav.home')}
            </Link>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <nav className="footer-nav">
          <Link to="/pro">{t('billing.title')}</Link>
          <Link to="/legal/terms">{t('legal.terms')}</Link>
          <Link to="/legal/privacy">{t('legal.privacy')}</Link>
          <Link to="/legal/tokushoho">{t('legal.tokushoho')}</Link>
        </nav>
        <span>{t('app.footer')}</span>
      </footer>
    </div>
  );
}
