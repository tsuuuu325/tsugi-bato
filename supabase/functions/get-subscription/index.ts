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
    const { deviceId } = await req.json();
    if (!deviceId || typeof deviceId !== 'string') {
      return jsonResponse({ error: 'deviceId required' }, 400);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) {
      return jsonResponse({
        status: 'inactive',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return jsonResponse({
      status: data.status ?? 'inactive',
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
