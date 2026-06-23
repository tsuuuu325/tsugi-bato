/** 本番サイトURL（Cloudflare Pages の VITE_SITE_URL を優先） */
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://tsugi-bato.pages.dev';
}

/** Supabase Auth のリダイレクト先（必ず Supabase Dashboard の Redirect URLs に登録） */
export function getAuthRedirectUrl(): string {
  return `${getSiteUrl()}/login`;
}
