import { getDeviceId } from '@/lib/profile';
import { isSupabaseConfigured, supabaseInsert, supabaseRpc } from '@/lib/supabase';

const SESSION_PREFIX = 'beatrelay-tracked';

export interface SiteStats {
  unique_visitors: number;
  pageviews: number;
  today_unique: number;
  today_pageviews: number;
}

let gaInitialized = false;

function initGoogleAnalytics(): void {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!gaId || gaInitialized || typeof document === 'undefined') return;
  gaInitialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', gaId, { anonymize_ip: true });
}

/** ページ閲覧を記録（同一セッション・同一パスは1回） */
export function trackPageView(path: string): void {
  initGoogleAnalytics();
  if (typeof window !== 'undefined' && window.gtag && import.meta.env.VITE_GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', { page_path: path });
  }
  if (!isSupabaseConfigured()) return;

  const key = `${SESSION_PREFIX}:${path}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  void supabaseInsert('site_visits', {
    visitor_id: getDeviceId(),
    path,
  });
}

export async function fetchSiteStats(): Promise<SiteStats | null> {
  if (!isSupabaseConfigured()) return null;
  const raw = await supabaseRpc<SiteStats>('get_site_stats');
  if (!raw) return null;
  return {
    unique_visitors: Number(raw.unique_visitors ?? 0),
    pageviews: Number(raw.pageviews ?? 0),
    today_unique: Number(raw.today_unique ?? 0),
    today_pageviews: Number(raw.today_pageviews ?? 0),
  };
}

export function showVisitorStats(): boolean {
  return import.meta.env.VITE_SHOW_VISITOR_STATS === 'true';
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
