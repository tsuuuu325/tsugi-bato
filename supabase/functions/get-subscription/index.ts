import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { cleanSecret } from '../_shared/env.ts';
import { subscriptionPeriodEndIso } from '../_shared/subscription.ts';

const stripeKey = cleanSecret(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

type SubscriptionRow = {
  device_id?: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

function isActiveStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

function toResponse(row: Pick<SubscriptionRow, 'status' | 'current_period_end' | 'cancel_at_period_end'>) {
  return {
    status: row.status ?? 'inactive',
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}

async function upsertFromStripeSub(
  sub: Stripe.Subscription,
  deviceId: string,
  row?: SubscriptionRow | null,
  customer?: Stripe.Customer | null,
) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await supabase.from('subscriptions').upsert({
    device_id: deviceId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: subscriptionPeriodEndIso(sub),
    customer_email: row?.customer_email ?? customer?.email ?? undefined,
    customer_name: row?.customer_name ?? (typeof customer?.name === 'string' ? customer.name : undefined),
    updated_at: new Date().toISOString(),
  });
}

async function copyRowToDevice(row: SubscriptionRow, deviceId: string) {
  await supabase.from('subscriptions').upsert({
    device_id: deviceId,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id,
    customer_email: row.customer_email,
    customer_name: row.customer_name,
    status: row.status,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
}

async function listActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  return list.data.find((s) => isActiveStatus(s.status)) ?? null;
}

async function findCustomerByDeviceId(deviceId: string): Promise<Stripe.Customer | null> {
  try {
    const search = await stripe.customers.search({
      query: `metadata['device_id']:'${deviceId}'`,
      limit: 1,
    });
    const hit = search.data[0];
    return hit && !hit.deleted ? hit : null;
  } catch {
    return null;
  }
}

async function findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const escaped = normalized.replace(/'/g, "\\'");
    const search = await stripe.customers.search({
      query: `email:'${escaped}'`,
      limit: 5,
    });
    const hit = search.data.find((c) => !c.deleted && c.email?.toLowerCase() === normalized);
    if (hit) return hit;
  } catch {
    /* fallback to list */
  }

  const list = await stripe.customers.list({ email: normalized, limit: 10 });
  return list.data.find((c) => !c.deleted && c.email?.toLowerCase() === normalized) ?? null;
}

async function findSubscriptionRowByEmail(email: string): Promise<SubscriptionRow | null> {
  const normalized = email.trim();
  if (!normalized) return null;

  const { data } = await supabase
    .from('subscriptions')
    .select('device_id, stripe_customer_id, stripe_subscription_id, customer_email, customer_name, status, current_period_end, cancel_at_period_end')
    .ilike('customer_email', normalized)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (!data?.length) return null;
  return data.find((row) => isActiveStatus(row.status)) ?? data[0];
}

async function findBillingEmailFromAuthUser(authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('device_backups')
    .select('profile')
    .eq('user_id', authUserId)
    .maybeSingle();
  const profile = data?.profile as { billingEmail?: string } | undefined;
  const email = profile?.billingEmail?.trim();
  return email || null;
}

async function fetchStripeSubscription(
  row: SubscriptionRow | null,
  deviceId: string,
  email?: string,
): Promise<{ sub: Stripe.Subscription | null; customer: Stripe.Customer | null }> {
  if (!stripeKey) return { sub: null, customer: null };

  if (row?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      if (isActiveStatus(sub.status)) {
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        return { sub, customer: customer.deleted ? null : customer };
      }
    } catch {
      /* try customer lookup */
    }
  }

  let customer: Stripe.Customer | null = null;

  if (row?.stripe_customer_id) {
    try {
      const c = await stripe.customers.retrieve(row.stripe_customer_id) as Stripe.Customer;
      customer = c.deleted ? null : c;
    } catch {
      customer = null;
    }
  }

  if (!customer) {
    customer = await findCustomerByDeviceId(deviceId);
  }

  if (!customer && email) {
    customer = await findCustomerByEmail(email.trim());
  }

  if (!customer) return { sub: null, customer: null };

  const sub = await listActiveSubscription(customer.id);
  return { sub, customer };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { deviceId, email, authUserId } = await req.json();
    if (!deviceId || typeof deviceId !== 'string') {
      return jsonResponse({ error: 'deviceId required' }, 400);
    }

    let normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (!normalizedEmail && typeof authUserId === 'string' && authUserId) {
      normalizedEmail = (await findBillingEmailFromAuthUser(authUserId)) ?? '';
    }

    const { data: deviceRow, error } = await supabase
      .from('subscriptions')
      .select('device_id, stripe_customer_id, stripe_subscription_id, customer_email, customer_name, status, current_period_end, cancel_at_period_end')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);

    let hintRow: SubscriptionRow | null = deviceRow;
    if (normalizedEmail && (!hintRow || !isActiveStatus(hintRow.status))) {
      const byEmail = await findSubscriptionRowByEmail(normalizedEmail);
      if (byEmail) hintRow = byEmail;
    }

    const lookupEmail = normalizedEmail || hintRow?.customer_email || undefined;
    const { sub: stripeSub, customer } = await fetchStripeSubscription(
      hintRow,
      deviceId,
      lookupEmail,
    );

    if (stripeSub) {
      await upsertFromStripeSub(stripeSub, deviceId, hintRow, customer);
      return jsonResponse({
        status: stripeSub.status,
        currentPeriodEnd: subscriptionPeriodEndIso(stripeSub),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      });
    }

    if (hintRow && isActiveStatus(hintRow.status)) {
      await copyRowToDevice(hintRow, deviceId);
      return jsonResponse(toResponse(hintRow));
    }

    if (!deviceRow) {
      return jsonResponse({
        status: 'inactive',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return jsonResponse(toResponse(deviceRow));
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
