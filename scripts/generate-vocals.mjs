/**
 * Generate vocal MP3s via Google Translate TTS (fallback when SAPI/Edge unavailable).
 * Run: node scripts/generate-vocals.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/audio/vocals');
mkdirSync(outDir, { recursive: true });

const vocals = {
  drift: 'I drift in the dark tonight. Smoke in the air.',
  smoke: 'Smoke in the air. I cannot see. Lost in the night.',
  yeah: 'Yeah. Yeah yeah. Ride that beat all night.',
  dark: 'Born in the dark. We ride. We never stop.',
  ride: 'Ride ride ride. Do not stop. Feel the bass drop.',
};

function fetchTts(text) {
  const q = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}`;
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://translate.google.com/',
      },
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchTtsRedirect(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`TTS HTTP ${res.statusCode}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

function fetchTtsRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

for (const [id, text] of Object.entries(vocals)) {
  console.log(`Generating: ${id}`);
  const audio = await fetchTts(text);
  const out = join(outDir, `${id}.mp3`);
  writeFileSync(out, audio);
  console.log(`  -> ${out} (${audio.length} bytes)`);
}

console.log('Done.');
