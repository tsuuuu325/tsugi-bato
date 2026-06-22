import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/LocaleProvider';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t } = useI18n();

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">{t('app.name')}</span>
        </Link>
        <nav className="header-nav">
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
