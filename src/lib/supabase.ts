export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function baseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL!.replace(/\/$/, '');
}

function headers(): HeadersInit {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

export async function supabaseGet<T>(path: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/${path}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function supabasePost(path: string, body: unknown): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function supabaseUpsert(
  path: string,
  body: unknown,
  onConflict: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/${path}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function supabaseInsert(path: string, body: unknown): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function supabaseDelete(path: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
      method: 'DELETE',
      headers: headers(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function supabaseRpc<T>(fn: string, body: Record<string, unknown> = {}): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
