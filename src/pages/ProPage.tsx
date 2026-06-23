import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSongStore } from '@/store/songStore';
import { useI18n } from '@/i18n/LocaleProvider';
import { useAuth } from '@/auth/AuthProvider';
import { LEGAL, PRO_PRICE_YEN } from '@/config/legal';
import {
  isBillingConfigured,
  createCheckoutSession,
  createPortalSession,
  fetchSubscription,
  syncProPlanFromServer,
  type SubscriptionInfo,
} from '@/lib/billing';
import { isProPlan } from '@/lib/plan';
import { getUserProfile, setBillingContact } from '@/lib/profile';

function isSubActive(info: SubscriptionInfo | null | undefined): boolean {
  return info?.status === 'active' || info?.status === 'trialing' || info?.status === 'past_due';
}

function resolveContactEmail(formEmail: string, authEmail: string | null): string {
  return formEmail.trim()
    || getUserProfile().billingEmail?.trim()
    || authEmail?.trim()
    || '';
}

export function ProPage() {
  const { t, locale } = useI18n();
  const { email: authEmail } = useAuth();
  const deviceId = useSongStore((s) => s.deviceId);
  const init = useSongStore((s) => s.init);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [billingEmail, setBillingEmail] = useState('');
  const [billingName, setBillingName] = useState('');
  const billingReady = isBillingConfigured();
  const isPro = isProPlan() || isSubActive(sub);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile.billingEmail) setBillingEmail(profile.billingEmail);
    else if (authEmail) setBillingEmail(authEmail);
    if (profile.billingName) setBillingName(profile.billingName);
  }, [authEmail]);

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      setMessage(t('billing.canceled'));
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (searchParams.get('success') !== '1') return;
    if (!deviceId || !billingReady) return;

    setMessage(t('billing.success'));
    void (async () => {
      const contactEmail = resolveContactEmail(billingEmail, authEmail);
      for (let attempt = 0; attempt < 4; attempt++) {
        await syncProPlanFromServer(deviceId, contactEmail || undefined);
        const { info } = await fetchSubscription(deviceId, contactEmail || undefined);
        setSub(info);
        if (isSubActive(info)) {
          searchParams.delete('success');
          setSearchParams(searchParams, { replace: true });
          return;
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
      }
      setMessage(t('billing.syncPending'));
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    })();
  }, [searchParams, setSearchParams, t, deviceId, billingReady, billingEmail, authEmail]);

  useEffect(() => {
    if (!deviceId || !billingReady) return;
    if (searchParams.get('success') === '1') return;
    const contactEmail = resolveContactEmail(billingEmail, authEmail);
    syncProPlanFromServer(deviceId, contactEmail || undefined).then(() => {
      fetchSubscription(deviceId, contactEmail || undefined).then(({ info }) => setSub(info));
    });
  }, [deviceId, billingReady, searchParams, billingEmail, authEmail]);

  const handleRestore = async () => {
    if (!deviceId) return;
    if (!billingReady) {
      setMessage(t('billing.notConfigured'));
      return;
    }
    const email = resolveContactEmail(billingEmail, authEmail);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage(t('billing.emailInvalid'));
      return;
    }
    setBillingContact(email, billingName.trim() || getUserProfile().billingName || '');
    setLoading(true);
    setMessage('');
    const plan = await syncProPlanFromServer(deviceId, email);
    const { info, error } = await fetchSubscription(deviceId, email);
    setSub(info);
    setLoading(false);
    if (plan === 'pro' || isSubActive(info)) {
      setMessage(t('billing.active'));
      return;
    }
    if (isProPlan()) {
      setMessage(t('billing.cloudProActive'));
      return;
    }
    if (error) {
      setMessage(t('billing.restoreError', { detail: error }));
      return;
    }
    setMessage(t('billing.restoreFailed'));
  };

  const handleSubscribe = async () => {
    if (!deviceId) return;
    if (!billingReady) {
      setMessage(t('billing.notConfigured'));
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
    setMessage(t('billing.errorDetail', { detail: error ?? 'unknown' }));
  };

  const handleManage = async () => {
    if (!deviceId || !billingReady) return;
    setLoading(true);
    setMessage('');
    const email = resolveContactEmail(billingEmail, authEmail);
    const { url, error } = await createPortalSession(deviceId, email || undefined);
    setLoading(false);
    if (url) window.location.href = url;
    else setMessage(t('billing.portalErrorDetail', { detail: error ?? 'unknown' }));
  };

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US')
    : null;

  const contactEmail = resolveContactEmail(billingEmail, authEmail);

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
            {billingReady && (
              <button type="button" className="btn btn-secondary" onClick={handleManage} disabled={loading}>
                {loading ? t('common.loading') : t('billing.manage')}
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
                {authEmail && authEmail !== billingEmail.trim() && (
                  <p className="hint hint--compact">{t('billing.restoreUseLoginEmail', { email: authEmail })}</p>
                )}
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
            <button type="button" className="btn btn-primary btn-large" onClick={handleSubscribe} disabled={loading || !billingReady}>
              {loading ? t('common.loading') : t('billing.subscribe')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRestore} disabled={loading || !billingReady}>
              {loading ? t('common.loading') : t('billing.restore')}
            </button>
            <p className="hint hint--compact">{t('billing.restoreHint')}</p>
            {contactEmail && (
              <p className="hint hint--compact">{t('billing.restoreLookupEmail', { email: contactEmail })}</p>
            )}
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
