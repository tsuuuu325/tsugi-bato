import { VOCAL_SAMPLES } from '@/audio/vocalSamples';

const cache = new Map<string, AudioBuffer>();
let loadPromise: Promise<void> | null = null;

async function fetchSample(ctx: AudioContext, id: string, url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load sample: ${url}`);
  const data = await res.arrayBuffer();
  const buffer = await ctx.decodeAudioData(data.slice(0));
  cache.set(id, buffer);
}

export async function ensureVocalSamplesLoaded(ctx: AudioContext): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await Promise.all(
      Object.values(VOCAL_SAMPLES).map((s) => {
        if (cache.has(s.id)) return Promise.resolve();
        return fetchSample(ctx, s.id, s.path);
      }),
    );
  })();
  return loadPromise;
}

export function getSampleBuffer(sampleId: string): AudioBuffer | null {
  return cache.get(sampleId) ?? null;
}

export function clearSampleCache(): void {
  cache.clear();
  loadPromise = null;
}
