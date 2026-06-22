import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function upsertFromSubscription(
  sub: Stripe.Subscription,
  deviceId: string,
  contact?: { email?: string | null; name?: string | null },
) {
  await supabase.from('subscriptions').upsert({
    device_id: deviceId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    customer_email: contact?.email ?? undefined,
    customer_name: contact?.name ?? undefined,
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature || !webhookSecret) return new Response('Webhook not configured', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const deviceId = session.metadata?.device_id;
        if (deviceId && session.subscription) {
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub, deviceId, {
            email: session.customer_details?.email ?? session.customer_email,
            name: session.customer_details?.name,
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const deviceId = sub.metadata?.device_id
          ?? (typeof sub.customer === 'string'
            ? (await stripe.customers.retrieve(sub.customer) as Stripe.Customer).metadata?.device_id
            : sub.customer.metadata?.device_id);
        if (deviceId) {
          await upsertFromSubscription(sub, deviceId);
        }
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
