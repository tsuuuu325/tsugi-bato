import type { Song, Layer } from '@/types';
import { getSectionTotalSteps, resizeStepPattern } from '@/types';
import { getDefaultPattern } from '@/audio/engine';
import {
  getAllSongs,
  getAllLayers,
  saveSong,
  replaceAllLayers,
  replaceAllSongs,
} from '@/lib/storage';

export const VOLENTO_EXAMPLE_ID = 'example-volento-001';
export const VOLENTO_SHARE_CODE = 'VOLNT1';
export const VOLENTO_BPM = 163;

const EXAMPLES_SEED_KEY = 'tsugi-bato-examples-version';
export const EXAMPLE_TITLE = 'original phonk';

const EXAMPLES_SEED_VERSION = 'volento-v8';

const EXAMPLE_CREATOR = 'BeatRelay';
const EXAMPLE_AVATAR = '💀';

function fitPattern(loopId: string, bpm: number): Layer['pattern'] {
  return resizeStepPattern(getDefaultPattern(loopId), getSectionTotalSteps(bpm));
}

function buildVolentoExample(now: string): { song: Song; layers: Layer[] } {
  const bpm = VOLENTO_BPM;
  const sectionBpms = [bpm, bpm, bpm];

  const song: Song = {
    id: VOLENTO_EXAMPLE_ID,
    shareCode: VOLENTO_SHARE_CODE,
    title: EXAMPLE_TITLE,
    bpm,
    referenceBpm: bpm,
    maxBars: 8,
    maxContributors: 6,
    status: 'complete',
    mode: 'solo',
    sectionCount: 3,
    sectionBpms,
    isExample: true,
    createdAt: now,
    updatedAt: now,
    creatorName: EXAMPLE_CREATOR,
  };

  const layers: Layer[] = [
    // 0–10s — intro: heavy 808 + tape hiss + swung hats
    {
      id: 'ex-vol-layer-01',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-kick',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 0,
      sectionIndex: 0,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-kick', bpm),
    },
    {
      id: 'ex-vol-layer-02',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-hat',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 1,
      sectionIndex: 0,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-hat', bpm),
    },
    {
      id: 'ex-vol-layer-03',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-vinyl',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 2,
      sectionIndex: 0,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-vinyl', bpm),
    },
    {
      id: 'ex-vol-layer-04',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-bass',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 3,
      sectionIndex: 0,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-bass', bpm),
    },

    // 10–20s — drop: full drum loop + Memphis melody + cowbell
    {
      id: 'ex-vol-layer-05',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-kick-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 4,
      sectionIndex: 1,
      addMode: 'extend',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-kick-l', bpm),
    },
    {
      id: 'ex-vol-layer-06',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-snare-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 5,
      sectionIndex: 1,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-snare-l', bpm),
    },
    {
      id: 'ex-vol-layer-07',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-hat-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 6,
      sectionIndex: 1,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-hat-l', bpm),
    },
    {
      id: 'ex-vol-layer-08',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-bass-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 7,
      sectionIndex: 1,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-bass-l', bpm),
    },
    {
      id: 'ex-vol-layer-09',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-mem-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 8,
      sectionIndex: 1,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-mem-l', bpm),
    },
    {
      id: 'ex-vol-layer-10',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-cow-l',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 9,
      sectionIndex: 1,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-cow-l', bpm),
    },

    // 20–30s — peak: full 808 stack + gun FX
    {
      id: 'ex-vol-layer-11',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-kick-phonk',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 10,
      sectionIndex: 2,
      addMode: 'extend',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-kick-phonk', bpm),
    },
    {
      id: 'ex-vol-layer-12',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-bass-phonk',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 11,
      sectionIndex: 2,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-bass-phonk', bpm),
    },
    {
      id: 'ex-vol-layer-13',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-snare',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 12,
      sectionIndex: 2,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-snare', bpm),
    },
    {
      id: 'ex-vol-layer-14',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-memphis',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 13,
      sectionIndex: 2,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-memphis', bpm),
    },
    {
      id: 'ex-vol-layer-15',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-cow',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 14,
      sectionIndex: 2,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-cow', bpm),
    },
    {
      id: 'ex-vol-layer-17',
      songId: VOLENTO_EXAMPLE_ID,
      loopId: 'pad-ex-volento-gun',
      contributorName: EXAMPLE_CREATOR,
      contributorAvatar: EXAMPLE_AVATAR,
      contributorIndex: 15,
      sectionIndex: 2,
      addMode: 'layer',
      isVirtual: false,
      addedAt: now,
      pattern: fitPattern('pad-ex-volento-gun', bpm),
    },
  ];

  return { song, layers };
}

/** アプリ内サンプル曲を localStorage に投入 */
export function seedExampleBeats(): void {
  const existing = getAllSongs().find((s) => s.id === VOLENTO_EXAMPLE_ID && s.isExample);
  const versionOk = localStorage.getItem(EXAMPLES_SEED_KEY) === EXAMPLES_SEED_VERSION;
  const needsUpdate = !versionOk || !existing || existing.title !== EXAMPLE_TITLE;
  if (!needsUpdate) return;

  const now = new Date().toISOString();
  const { song, layers } = buildVolentoExample(now);

  const songs = getAllSongs().filter((s) => s.id !== VOLENTO_EXAMPLE_ID);
  const otherLayers = getAllLayers().filter((l) => l.songId !== VOLENTO_EXAMPLE_ID);

  replaceAllSongs([song, ...songs]);
  replaceAllLayers([...otherLayers, ...layers]);

  localStorage.setItem(EXAMPLES_SEED_KEY, EXAMPLES_SEED_VERSION);
}

export function getExampleSongs(): Song[] {
  return getAllSongs().filter((s) => s.isExample);
}
