import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { cleanSecret } from '../_shared/env.ts';

const stripeKey = cleanSecret(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const priceId = cleanSecret(Deno.env.get('STRIPE_PRICE_ID') ?? '');

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function validateConfig(): string | null {
  if (!stripeKey) return 'STRIPE_SECRET_KEY not configured in Supabase Edge Function secrets';
  if (!stripeKey.startsWith('sk_')) {
    return 'Invalid STRIPE_SECRET_KEY. Use sk_test_... from Stripe Developers > API keys (not sb_secret_)';
  }
  if (!priceId) return 'STRIPE_PRICE_ID not configured in Supabase Edge Function secrets';
  if (!priceId.startsWith('price_')) return 'Invalid STRIPE_PRICE_ID format';
  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getOrCreateCustomer(
  deviceId: string,
  email: string,
  customerName: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    await stripe.customers.update(existing.stripe_customer_id, {
      email,
      name: customerName,
    });
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name: customerName,
    metadata: { device_id: deviceId },
  });

  await supabase.from('subscriptions').upsert({
    device_id: deviceId,
    stripe_customer_id: customer.id,
    customer_email: email,
    customer_name: customerName,
    status: 'inactive',
    updated_at: new Date().toISOString(),
  });

  return customer.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const configError = validateConfig();
  if (configError) return jsonResponse({ error: configError }, 500);

  try {
    const { deviceId, successUrl, cancelUrl, locale, email, customerName } = await req.json();
    if (!deviceId || !successUrl || !cancelUrl) {
      return jsonResponse({ error: 'deviceId, successUrl, cancelUrl required' }, 400);
    }

    const normalizedEmail = String(email ?? '').trim();
    const normalizedName = String(customerName ?? '').trim();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return jsonResponse({ error: 'Valid email required' }, 400);
    }
    if (!normalizedName || normalizedName.length > 80) {
      return jsonResponse({ error: 'customerName required (max 80 chars)' }, 400);
    }

    const customerId = await getOrCreateCustomer(deviceId, normalizedEmail, normalizedName);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: locale === 'en' ? 'en' : 'ja',
      allow_promotion_codes: true,
      customer_update: {
        name: 'auto',
      },
      subscription_data: {
        metadata: { device_id: deviceId },
      },
      metadata: { device_id: deviceId },
    });

    return jsonResponse({ url: session.url });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
