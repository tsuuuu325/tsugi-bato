import { isSupabaseConfigured } from '@/lib/supabase';
import { getUserProfile, saveUserProfile } from '@/lib/profile';
import type { UserPlan } from '@/types';

export interface SubscriptionInfo {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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
): Promise<SubscriptionInfo | null> {
  const body: { deviceId: string; email?: string } = { deviceId };
  const normalized = email?.trim();
  if (normalized) body.email = normalized;
  const { data } = await invokeFunction<SubscriptionInfo>('get-subscription', body);
  return data;
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

export async function createPortalSession(deviceId: string): Promise<{ url: string | null; error: string | null }> {
  const origin = window.location.origin;
  const { data, error } = await invokeFunction<{ url?: string; error?: string }>('create-portal-session', {
    deviceId,
    returnUrl: `${origin}/pro`,
  });
  if (error) return { url: null, error };
  if (data?.error) return { url: null, error: data.error };
  return { url: data?.url ?? null, error: data?.url ? null : 'no_portal_url' };
}

function isActiveSubscription(info: SubscriptionInfo | null): boolean {
  if (!info) return false;
  return info.status === 'active' || info.status === 'trialing';
}

/** ログイン端末でも Stripe / クラウド上の Pro を反映（email で横断検索） */
export async function syncProPlanFromServer(deviceId: string, email?: string): Promise<UserPlan> {
  const profile = getUserProfile();
  const contactEmail = email?.trim() || profile.billingEmail?.trim() || undefined;

  if (!billingEnabled() || !deviceId) {
    return profile.plan ?? 'free';
  }

  const sub = await fetchSubscription(deviceId, contactEmail);
  const serverPlan: UserPlan = isActiveSubscription(sub) ? 'pro' : 'free';

  if (serverPlan === 'pro') {
    if (profile.plan !== 'pro') {
      saveUserProfile({ ...getUserProfile(), plan: 'pro' });
    }
    return 'pro';
  }

  // メールまたは Stripe 照会済みのときだけ free に落とす（別端末の未照会 state で Pro を消さない）
  if (contactEmail || sub) {
    if (profile.plan !== serverPlan) {
      saveUserProfile({ ...getUserProfile(), plan: serverPlan });
    }
    return serverPlan;
  }

  return profile.plan ?? 'free';
}
