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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

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
) {
  await supabase.from('subscriptions').upsert({
    device_id: deviceId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: subscriptionPeriodEndIso(sub),
    customer_email: row?.customer_email ?? undefined,
    customer_name: row?.customer_name ?? undefined,
    updated_at: new Date().toISOString(),
  });
}

async function listActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 5,
  });
  return list.data.find((s) => s.status === 'active' || s.status === 'trialing') ?? list.data[0] ?? null;
}

async function findCustomerByDeviceId(deviceId: string): Promise<Stripe.Customer | null> {
  const search = await stripe.customers.search({
    query: `metadata['device_id']:'${deviceId}'`,
    limit: 1,
  });
  const hit = search.data[0];
  return hit && !hit.deleted ? hit : null;
}

async function findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const list = await stripe.customers.list({ email, limit: 5 });
  const hit = list.data.find((c) => !c.deleted && c.email?.toLowerCase() === email.toLowerCase());
  return hit ?? null;
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
      if (sub.status !== 'canceled') {
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
    const { deviceId, email } = await req.json();
    if (!deviceId || typeof deviceId !== 'string') {
      return jsonResponse({ error: 'deviceId required' }, 400);
    }
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';

    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, customer_email, customer_name, status, current_period_end, cancel_at_period_end')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);

    const { sub: stripeSub, customer } = await fetchStripeSubscription(
      data,
      deviceId,
      normalizedEmail || data?.customer_email || undefined,
    );
    if (stripeSub) {
      const contact = {
        customer_email: data?.customer_email ?? customer?.email ?? (normalizedEmail || undefined),
        customer_name: data?.customer_name ?? customer?.name ?? undefined,
      };
      await upsertFromStripeSub(stripeSub, deviceId, { ...data, ...contact });
      return jsonResponse({
        status: stripeSub.status,
        currentPeriodEnd: subscriptionPeriodEndIso(stripeSub),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      });
    }

    if (!data) {
      return jsonResponse({
        status: 'inactive',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return jsonResponse(toResponse(data));
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
