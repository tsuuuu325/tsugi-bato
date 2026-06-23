import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseAuthConfigured } from '@/lib/supabaseClient';
import { getAuthRedirectUrl } from '@/lib/siteUrl';

export function isAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}

export function getAuthCallbackRedirectUrl(): string {
  return getAuthRedirectUrl();
}

/** メール / Google ログイン後の ?code= をセッションに交換 */
export async function completeAuthCallbackFromUrl(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return { error: null };

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    const clean = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', clean);
  }
  return { error: error?.message ?? null };
}

export async function getAuthSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  return { error: error?.message ?? null };
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: false,
    },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function subscribeAuthChanges(
  onChange: (session: Session | null) => void,
): () => void {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });
  return () => subscription.unsubscribe();
}

export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'authGoogleDisabled';
  }
  if (lower.includes('redirect') && lower.includes('not allowed')) {
    return 'authRedirectNotAllowed';
  }
  return message;
}
