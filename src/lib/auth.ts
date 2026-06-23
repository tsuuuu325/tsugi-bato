import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseAuthConfigured } from '@/lib/supabaseClient';
import { getAuthRedirectUrl } from '@/lib/siteUrl';

export function isAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}

export function getAuthCallbackRedirectUrl(): string {
  return getAuthRedirectUrl();
}

function cleanAuthUrl(): void {
  window.history.replaceState(null, '', window.location.pathname);
}

function readAuthParams(): URLSearchParams {
  const fromSearch = new URLSearchParams(window.location.search);
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const merged = new URLSearchParams(fromSearch);
  fromHash.forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged;
}

/** メール / Google ログイン後の URL パラメータをセッションに交換 */
export async function completeAuthCallbackFromUrl(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };

  const params = readAuthParams();
  const tokenHash = params.get('token_hash');
  const otpType = params.get('type');

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    if (!error) cleanAuthUrl();
    return { error: error?.message ?? null };
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('code verifier') || msg.includes('invalid flow state')) {
        return { error: 'authMagicLinkWrongBrowser' };
      }
      return { error: error.message };
    }
    cleanAuthUrl();
    return { error: null };
  }

  // implicit フロー: #access_token=... は detectSessionInUrl が処理
  const { data: { session } } = await supabase.auth.getSession();
  if (session && (params.has('access_token') || window.location.hash.includes('access_token'))) {
    cleanAuthUrl();
  }

  return { error: null };
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
  if (message === 'authMagicLinkWrongBrowser') {
    return message;
  }
  return message;
}
