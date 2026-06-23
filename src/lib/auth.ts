import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseAuthConfigured } from '@/lib/supabaseClient';

export function isAuthConfigured(): boolean {
  return isSupabaseAuthConfigured();
}

export async function getAuthSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  return { error: error?.message ?? null };
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'authNotConfigured' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login`,
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
