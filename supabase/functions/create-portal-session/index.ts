import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { cleanSecret } from '../_shared/env.ts';

const stripeKey = cleanSecret(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function findCustomerByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const escaped = normalized.replace(/'/g, "\\'");
    const search = await stripe.customers.search({
      query: `email:'${escaped}'`,
      limit: 1,
    });
    const hit = search.data.find((c) => !c.deleted && c.email?.toLowerCase() === normalized);
    if (hit) return hit.id;
  } catch {
    /* fallback */
  }
  const list = await stripe.customers.list({ email: normalized, limit: 5 });
  const hit = list.data.find((c) => !c.deleted && c.email?.toLowerCase() === normalized);
  return hit?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { deviceId, returnUrl, email } = await req.json();
    if (!deviceId || !returnUrl) {
      return jsonResponse({ error: 'deviceId and returnUrl required' }, 400);
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('device_id', deviceId)
      .maybeSingle();

    let customerId = data?.stripe_customer_id ?? null;

    if (!customerId && typeof email === 'string' && email.trim()) {
      const { data: byEmail } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .ilike('customer_email', email.trim())
        .not('stripe_customer_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      customerId = byEmail?.stripe_customer_id ?? null;
    }

    if (!customerId && typeof email === 'string' && email.trim()) {
      customerId = await findCustomerByEmail(email.trim());
    }

    if (!customerId) {
      return jsonResponse({ error: 'No subscription customer found' }, 404);
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portal.url });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
