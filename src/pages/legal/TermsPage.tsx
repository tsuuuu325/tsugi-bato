import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/LocaleProvider';
import { LEGAL } from '@/config/legal';

export function TermsPage() {
  const { t } = useI18n();

  return (
    <div className="page legal-page">
      <h1 className="page-title">{t('legal.terms')}</h1>
      <p className="page-desc legal-updated">{t('legal.lastUpdated')}</p>

      <article className="card legal-content">
        <section>
          <h2>{t('legal.termsS1Title')}</h2>
          <p>{t('legal.termsS1Body', { service: LEGAL.serviceName })}</p>
        </section>
        <section>
          <h2>{t('legal.termsS2Title')}</h2>
          <p>{t('legal.termsS2Body')}</p>
        </section>
        <section>
          <h2>{t('legal.termsS3Title')}</h2>
          <p>{t('legal.termsS3Body', { price: LEGAL.priceLabel })}</p>
        </section>
        <section>
          <h2>{t('legal.termsS4Title')}</h2>
          <p>{t('legal.termsS4Body', { policy: LEGAL.cancelPolicy })}</p>
        </section>
        <section>
          <h2>{t('legal.termsS5Title')}</h2>
          <p>{t('legal.termsS5Body')}</p>
        </section>
        <section>
          <h2>{t('legal.termsS6Title')}</h2>
          <p>{t('legal.termsS6Body', { email: LEGAL.email })}</p>
        </section>
      </article>

      <Link to="/pro" className="btn btn-secondary">{t('billing.title')}</Link>
    </div>
  );
}
