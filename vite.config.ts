import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITEMAP_PATHS = [
  '/',
  '/timeline',
  '/create',
  '/collaborate',
  '/pro',
  '/legal/terms',
  '/legal/privacy',
  '/legal/tokushoho',
];

function seoBuildPlugin(siteUrl: string, googleVerification?: string) {
  return {
    name: 'seo-build',
    transformIndexHtml(html: string) {
      let out = html;
      if (googleVerification && !html.includes('google-site-verification')) {
        out = out.replace(
          '</head>',
          `    <meta name="google-site-verification" content="${googleVerification}" />\n  </head>`,
        );
      }
      if (siteUrl && !html.includes('property="og:url"')) {
        out = out.replace(
          '</head>',
          `    <meta property="og:url" content="${siteUrl}/" />\n  </head>`,
        );
      }
      return out;
    },
    closeBundle() {
      const base = siteUrl.replace(/\/$/, '');
      const urls = SITEMAP_PATHS.map((path) => {
        const priority = path === '/' ? '1.0' : path === '/timeline' ? '0.9' : '0.5';
        const changefreq = path === '/timeline' ? 'daily' : path === '/' ? 'weekly' : 'monthly';
        return `  <url>\n    <loc>${base}${path === '/' ? '/' : path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      }).join('\n');
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
      const outDir = resolve(process.cwd(), 'dist');
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap, 'utf8');
      writeFileSync(resolve(outDir, 'robots.txt'), robots, 'utf8');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = env.VITE_SITE_URL?.trim() || 'https://tsugi-bato.pages.dev';
  const googleVerification = env.VITE_GOOGLE_SITE_VERIFICATION?.trim();

  return {
    plugins: [
      react(),
      seoBuildPlugin(siteUrl, googleVerification),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'sitemap.xml'],
        manifest: {
          name: 'BeatRelay — コラボ型ビートメーカー',
          short_name: 'BeatRelay',
          description: '10秒ずつ phonk ビートを重ねる。みんなで30秒に。',
          theme_color: '#0a0a0f',
          background_color: '#0a0a0f',
          display: 'standalone',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
