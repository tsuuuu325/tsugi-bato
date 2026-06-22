import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { deviceId, returnUrl } = await req.json();
    if (!deviceId || !returnUrl) {
      return jsonResponse({ error: 'deviceId and returnUrl required' }, 400);
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      return jsonResponse({ error: 'No subscription customer found' }, 404);
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portal.url });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
