import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSongStore } from '@/store/songStore';
import { useI18n } from '@/i18n/LocaleProvider';
import { LEGAL, PRO_PRICE_YEN } from '@/config/legal';
import {
  isBillingConfigured,
  createCheckoutSession,
  createPortalSession,
  fetchSubscription,
  syncProPlanFromServer,
  type SubscriptionInfo,
} from '@/lib/billing';
import { isProPlan, setUserPlan } from '@/lib/plan';
import { getUserProfile, setBillingContact } from '@/lib/profile';

export function ProPage() {
  const { t, locale } = useI18n();
  const deviceId = useSongStore((s) => s.deviceId);
  const init = useSongStore((s) => s.init);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [billingEmail, setBillingEmail] = useState('');
  const [billingName, setBillingName] = useState('');
  const billingReady = isBillingConfigured();
  const isPro = isProPlan();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile.billingEmail) setBillingEmail(profile.billingEmail);
    if (profile.billingName) setBillingName(profile.billingName);
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setMessage(t('billing.success'));
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.get('canceled') === '1') {
      setMessage(t('billing.canceled'));
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (!deviceId || !billingReady) return;
    syncProPlanFromServer(deviceId).then(() => {
      fetchSubscription(deviceId).then(setSub);
    });
  }, [deviceId, billingReady, message]);

  const handleSubscribe = async () => {
    if (!deviceId) return;
    if (!billingReady) {
      setUserPlan('pro');
      setMessage(t('billing.testActivated'));
      return;
    }
    const email = billingEmail.trim();
    const name = billingName.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage(t('billing.emailInvalid'));
      return;
    }
    if (!name) {
      setMessage(t('billing.nameRequired'));
      return;
    }
    setBillingContact(email, name);
    setLoading(true);
    setMessage('');
    const { url, error } = await createCheckoutSession(deviceId, locale, {
      email,
      customerName: name,
    });
    setLoading(false);
    if (url) {
      window.location.href = url;
      return;
    }
    if (error === 'billing_disabled') {
      setUserPlan('pro');
      setMessage(t('billing.testActivated'));
      return;
    }
    setMessage(t('billing.errorDetail', { detail: error ?? 'unknown' }));
  };

  const handleManage = async () => {
    if (!deviceId || !billingReady) return;
    setLoading(true);
    setMessage('');
    const { url, error } = await createPortalSession(deviceId);
    setLoading(false);
    if (url) window.location.href = url;
    else setMessage(t('billing.portalErrorDetail', { detail: error ?? 'unknown' }));
  };

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US')
    : null;

  return (
    <div className="page pro-page">
      <h1 className="page-title">{t('billing.title')}</h1>
      <p className="page-desc">{t('billing.subtitle')}</p>

      {message && (
        <p className={`hint hint--compact message-box ${message.includes('⚠') ? 'message-box--warn' : 'message-box--ok'}`}>
          {message}
        </p>
      )}

      <section className="card pro-pricing-card">
        <div className="pro-price">
          <span className="pro-price-amount">¥{PRO_PRICE_YEN}</span>
          <span className="pro-price-period">{t('billing.perMonth')}</span>
        </div>
        <ul className="pro-features">
          <li>{t('billing.featureCreate')}</li>
          <li>{t('billing.featureDaily')}</li>
        </ul>

        {isPro ? (
          <>
            <p className="hint hint--compact">{t('billing.active')}</p>
            {periodEnd && (
              <p className="hint hint--compact">
                {sub?.cancelAtPeriodEnd
                  ? t('billing.expiresOn', { date: periodEnd })
                  : t('billing.renewsOn', { date: periodEnd })}
              </p>
            )}
            {billingReady ? (
              <button type="button" className="btn btn-secondary" onClick={handleManage} disabled={loading}>
                {loading ? t('common.loading') : t('billing.manage')}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => { setUserPlan('free'); setMessage(t('billing.testDeactivated')); }}>
                {t('plan.freeLabel')}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="hint hint--compact">{t('plan.upgradeHint')}</p>
            {billingReady && (
              <div className="pro-billing-form">
                <p className="label">{t('billing.contactTitle')}</p>
                <label className="label label--sub" htmlFor="billing-email">{t('billing.emailLabel')}</label>
                <input
                  id="billing-email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                />
                <label className="label label--sub" htmlFor="billing-name">{t('billing.nameLabel')}</label>
                <input
                  id="billing-name"
                  type="text"
                  className="input"
                  autoComplete="name"
                  placeholder={t('billing.namePlaceholder')}
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  maxLength={80}
                />
                <p className="hint hint--compact">{t('billing.contactHint')}</p>
              </div>
            )}
            <button type="button" className="btn btn-primary btn-large" onClick={handleSubscribe} disabled={loading}>
              {loading ? t('common.loading') : t('billing.subscribe')}
            </button>
            {!billingReady && (
              <p className="hint hint--compact">{t('billing.notConfigured')}</p>
            )}
          </>
        )}
      </section>

      <section className="card legal-snippet">
        <h2 className="section-title">{t('billing.beforePayTitle')}</h2>
        <ul className="legal-list">
          <li>{t('billing.disclosurePrice', { price: LEGAL.priceLabel })}</li>
          <li>{t('billing.disclosurePayment', { methods: LEGAL.paymentMethods })}</li>
          <li>{t('billing.disclosureRenewal')}</li>
          <li>{t('billing.disclosureCancel', { policy: LEGAL.cancelPolicy })}</li>
        </ul>
        <div className="legal-links-inline">
          <Link to="/legal/terms">{t('legal.terms')}</Link>
          <Link to="/legal/privacy">{t('legal.privacy')}</Link>
          <Link to="/legal/tokushoho">{t('legal.tokushoho')}</Link>
        </div>
        <p className="hint hint--compact">{t('billing.agreeHint')}</p>
      </section>

      <Link to="/" className="btn btn-secondary">{t('common.homeLink')}</Link>
    </div>
  );
}
