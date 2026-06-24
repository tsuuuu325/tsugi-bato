import { APP_NAME, APP_TAGLINE_EN, APP_TAGLINE_JA } from '@/config/app';
import { getSiteUrl } from '@/lib/siteUrl';

export type SeoLocale = 'ja' | 'en';

interface PageSeo {
  title: string;
  description: string;
}

const ROUTE_SEO: Record<string, Record<SeoLocale, PageSeo>> = {
  '/': {
    ja: {
      title: `${APP_NAME} — みんなで phonk ビートを30秒に`,
      description: `${APP_TAGLINE_JA}。10秒ずつ音を重ねて、リンクで渡すコラボ型ビートメーカー。drift phonk・808・カウベルで曲を完成させよう。`,
    },
    en: {
      title: `${APP_NAME} — Stack phonk beats together`,
      description: `${APP_TAGLINE_EN} Collaborative 30-second phonk beat maker — layer kicks, 808s, and cowbells one turn at a time.`,
    },
  },
  '/timeline': {
    ja: {
      title: `タイムライン — ${APP_NAME}`,
      description: '完成した phonk ビートを聴く・コメントする。みんなで積み上げた30秒曲の一覧。',
    },
    en: {
      title: `Timeline — ${APP_NAME}`,
      description: 'Listen to finished collaborative phonk beats and leave comments.',
    },
  },
  '/create': {
    ja: {
      title: `曲を始める — ${APP_NAME}`,
      description: '最初の10秒から phonk ビートを作って、リンクで仲間に渡そう。',
    },
    en: {
      title: `Start a beat — ${APP_NAME}`,
      description: 'Build the first 10 seconds and pass the link to friends.',
    },
  },
  '/collaborate': {
    ja: {
      title: `続きに参加 — ${APP_NAME}`,
      description: '仲間の曲に音を重ねるか、次の10秒を追加して30秒の phonk ビートを完成させよう。',
    },
    en: {
      title: `Join a track — ${APP_NAME}`,
      description: 'Layer sounds or add the next 10 seconds to a shared beat.',
    },
  },
  '/pro': {
    ja: {
      title: `Pro プラン — ${APP_NAME}`,
      description: '作曲数と1日の追加回数が無制限になる Pro プラン（月500円・税込）。',
    },
    en: {
      title: `Pro plan — ${APP_NAME}`,
      description: 'Unlimited songs and daily sessions with the Pro plan.',
    },
  },
  '/legal/terms': {
    ja: { title: `利用規約 — ${APP_NAME}`, description: `${APP_NAME} の利用規約。` },
    en: { title: `Terms — ${APP_NAME}`, description: `Terms of service for ${APP_NAME}.` },
  },
  '/legal/privacy': {
    ja: { title: `プライバシーポリシー — ${APP_NAME}`, description: `${APP_NAME} のプライバシーポリシー。` },
    en: { title: `Privacy — ${APP_NAME}`, description: `Privacy policy for ${APP_NAME}.` },
  },
  '/legal/tokushoho': {
    ja: { title: `特定商取引法に基づく表記 — ${APP_NAME}`, description: `${APP_NAME} Pro プランの販売者情報・料金・解約方法。` },
    en: { title: `Legal notice — ${APP_NAME}`, description: `Seller information and pricing for ${APP_NAME} Pro.` },
  },
};

const DEFAULT_SEO: Record<SeoLocale, PageSeo> = ROUTE_SEO['/'];

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function resolveRouteSeo(pathname: string, locale: SeoLocale): PageSeo {
  if (ROUTE_SEO[pathname]) return ROUTE_SEO[pathname][locale];
  if (pathname.startsWith('/song/') || pathname.startsWith('/s/')) {
    return locale === 'ja'
      ? { title: `曲を聴く — ${APP_NAME}`, description: 'コラボで作った phonk ビートを再生。' }
      : { title: `Listen — ${APP_NAME}`, description: 'Play a collaborative phonk beat.' };
  }
  return DEFAULT_SEO[locale];
}

/** ルート変更時に title / description / OGP / canonical を更新 */
export function applyPageSeo(pathname: string, locale: SeoLocale): void {
  const seo = resolveRouteSeo(pathname, locale);
  const siteUrl = getSiteUrl();
  const canonicalPath = pathname === '/' ? '' : pathname;
  const pageUrl = `${siteUrl}${canonicalPath}`;

  document.title = seo.title;
  document.documentElement.lang = locale === 'ja' ? 'ja' : 'en';
  setMeta('description', seo.description);
  setMeta('og:title', seo.title, 'property');
  setMeta('og:description', seo.description, 'property');
  setMeta('og:url', pageUrl, 'property');
  setMeta('og:type', 'website', 'property');
  setMeta('og:site_name', APP_NAME, 'property');
  setMeta('og:locale', locale === 'ja' ? 'ja_JP' : 'en_US', 'property');
  setMeta('twitter:card', 'summary', 'name');
  setMeta('twitter:title', seo.title, 'name');
  setMeta('twitter:description', seo.description, 'name');
  setCanonical(pageUrl);
}

/** トップページ用 JSON-LD（検索結果のリッチ表示用） */
export function injectAppJsonLd(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('app-jsonld')) return;

  const script = document.createElement('script');
  script.id = 'app-jsonld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: APP_NAME,
    description: APP_TAGLINE_JA,
    url: getSiteUrl(),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
  });
  document.head.appendChild(script);
}

export const SITEMAP_PATHS = [
  '/',
  '/timeline',
  '/create',
  '/collaborate',
  '/pro',
  '/legal/terms',
  '/legal/privacy',
  '/legal/tokushoho',
] as const;
