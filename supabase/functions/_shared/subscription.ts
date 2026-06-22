import type Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';

export function subscriptionPeriodEndIso(sub: Stripe.Subscription): string | null {
  const raw = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const date = new Date(raw * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
