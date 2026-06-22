import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/LocaleProvider';
import { LEGAL } from '@/config/legal';

export function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="page legal-page">
      <h1 className="page-title">{t('legal.privacy')}</h1>
      <p className="page-desc legal-updated">{t('legal.lastUpdated')}</p>

      <article className="card legal-content">
        <section>
          <h2>{t('legal.privacyS1Title')}</h2>
          <p>{t('legal.privacyS1Body', { operator: LEGAL.operatorName, email: LEGAL.email })}</p>
        </section>
        <section>
          <h2>{t('legal.privacyS2Title')}</h2>
          <p>{t('legal.privacyS2Body')}</p>
        </section>
        <section>
          <h2>{t('legal.privacyS3Title')}</h2>
          <p>{t('legal.privacyS3Body')}</p>
        </section>
        <section>
          <h2>{t('legal.privacyS4Title')}</h2>
          <p>{t('legal.privacyS4Body')}</p>
        </section>
        <section>
          <h2>{t('legal.privacyS5Title')}</h2>
          <p>{t('legal.privacyS5Body', { email: LEGAL.email })}</p>
        </section>
      </article>

      <Link to="/" className="btn btn-secondary">{t('common.homeLink')}</Link>
    </div>
  );
}
