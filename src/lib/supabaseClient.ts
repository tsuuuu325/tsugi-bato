import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // implicit: メールリンクを別ブラウザ（Gmailアプリ等）で開いてもログインできる
          flowType: 'implicit',
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabase);
}
