import { isSupabaseConfigured } from '@/lib/supabase';
import { getUserProfile, saveUserProfile } from '@/lib/profile';
import { isProductionSite } from '@/lib/siteUrl';
import type { UserPlan } from '@/types';

export interface SubscriptionInfo {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** false = Stripe テストモードの契約（本番サイトでは Pro 対象外） */
  livemode?: boolean;
}

function functionsBaseUrl(): string | null {
  if (!isSupabaseConfigured()) return null;
  return `${import.meta.env.VITE_SUPABASE_URL!.replace(/\/$/, '')}/functions/v1`;
}

function billingEnabled(): boolean {
  return import.meta.env.VITE_BILLING_ENABLED === 'true' && Boolean(functionsBaseUrl());
}

export function isBillingConfigured(): boolean {
  return billingEnabled();
}

async function invokeFunction<T>(name: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  const base = functionsBaseUrl();
  if (!base || !billingEnabled()) {
    return { data: null, error: 'billing_disabled' };
  }
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!;
  try {
    const res = await fetch(`${base}/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const msg = typeof parsed === 'object' && parsed && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : typeof parsed === 'object' && parsed && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : text || `HTTP ${res.status}`;
      return { data: null, error: msg };
    }
    return { data: parsed as T, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

export async function fetchSubscription(
  deviceId: string,
  email?: string,
): Promise<{ info: SubscriptionInfo | null; error: string | null }> {
  const profile = getUserProfile();
  const body: { deviceId: string; email?: string; authUserId?: string } = { deviceId };
  const normalized = email?.trim() || profile.billingEmail?.trim();
  if (normalized) body.email = normalized;
  if (profile.authUserId) body.authUserId = profile.authUserId;
  const { data, error } = await invokeFunction<SubscriptionInfo>('get-subscription', body);
  return { info: data, error };
}

export interface CheckoutContact {
  email: string;
  customerName: string;
}

export async function createCheckoutSession(
  deviceId: string,
  locale: string,
  contact: CheckoutContact,
): Promise<{ url: string | null; error: string | null }> {
  const origin = window.location.origin;
  const { data, error } = await invokeFunction<{ url?: string; error?: string }>('create-checkout-session', {
    deviceId,
    locale,
    email: contact.email.trim(),
    customerName: contact.customerName.trim(),
    successUrl: `${origin}/pro?success=1`,
    cancelUrl: `${origin}/pro?canceled=1`,
  });
  if (error) return { url: null, error };
  if (data?.error) return { url: null, error: data.error };
  return { url: data?.url ?? null, error: data?.url ? null : 'no_checkout_url' };
}

export async function createPortalSession(
  deviceId: string,
  email?: string,
): Promise<{ url: string | null; error: string | null }> {
  const origin = window.location.origin;
  const profile = getUserProfile();
  const contactEmail = email?.trim() || profile.billingEmail?.trim();
  const { data, error } = await invokeFunction<{ url?: string; error?: string }>('create-portal-session', {
    deviceId,
    returnUrl: `${origin}/pro`,
    email: contactEmail,
  });
  if (error) return { url: null, error };
  if (data?.error) return { url: null, error: data.error };
  return { url: data?.url ?? null, error: data?.url ? null : 'no_portal_url' };
}

function isActiveSubscription(info: SubscriptionInfo | null): boolean {
  if (!info) return false;
  return info.status === 'active' || info.status === 'trialing' || info.status === 'past_due';
}

/** 本番公開サイトでは Stripe の本番契約（livemode）のみ Pro */
export function isPaidSubscription(info: SubscriptionInfo | null): boolean {
  if (!isActiveSubscription(info)) return false;
  if (isProductionSite()) return info.livemode === true;
  return true;
}

export function isTestModeSubscription(info: SubscriptionInfo | null): boolean {
  if (!info) return false;
  return isActiveSubscription(info) && info.livemode === false;
}

function planFromSubscription(info: SubscriptionInfo | null): UserPlan {
  return isPaidSubscription(info) ? 'pro' : 'free';
}

/** Stripe 照会が完了するまで null。課金 ON 時は Pro 判定に localStorage を信用しない */
let verifiedPlan: UserPlan | null = null;

export function resetEntitlementCache(): void {
  verifiedPlan = null;
}

/** 課金 ON 時は Stripe 照会済みの契約だけ Pro とみなす */
export function isProEntitled(): boolean {
  if (!billingEnabled()) {
    return getUserProfile().plan === 'pro';
  }
  return verifiedPlan === 'pro';
}

/** ログイン端末でも Stripe / クラウド上の Pro を反映（email で横断検索） */
export async function syncProPlanFromServer(deviceId: string, email?: string): Promise<UserPlan> {
  const profile = getUserProfile();
  const contactEmail = email?.trim() || profile.billingEmail?.trim() || undefined;

  if (!billingEnabled() || !deviceId) {
    verifiedPlan = profile.plan ?? 'free';
    return verifiedPlan;
  }

  const { info: sub, error } = await fetchSubscription(deviceId, contactEmail);
  if (error) {
    verifiedPlan = 'free';
    if (profile.plan === 'pro') {
      saveUserProfile({ ...getUserProfile(), plan: 'free' });
    }
    return 'free';
  }

  const serverPlan: UserPlan = planFromSubscription(sub);
  verifiedPlan = serverPlan;

  if (profile.plan !== serverPlan) {
    saveUserProfile({ ...getUserProfile(), plan: serverPlan });
  }
  return serverPlan;
}
